#!/usr/bin/env python3
"""La API de punta a punta, contra la base de verdad.

No usa servidor: `httpx` habla directo con la aplicación. Lo que sí es real es
la base, porque lo que hay que probar es justamente lo que hace la base
(disparadores, restricciones, permisos del rol).

Cada prueba dice qué tiene que pasar Y qué NO tiene que pasar. Un test que sólo
mira que lo bueno funcione no sirve: un sistema que acepta todo también pasaría.
"""
import json
import os
import sys
from pathlib import Path

AQUI = Path(__file__).parent
sys.path.insert(0, str(AQUI.parent))
os.environ.setdefault("ENTORNO", "desarrollo")

# Base LOCAL y descartable. No es una comodidad: las pruebas corrían contra la
# misma base que sirve la URL pública y así dejé una cuenta de administrador con
# contraseña conocida en internet. Un resto de un test no puede ser una
# exposición real. Poniendo DATABASE_URL a mano se puede apuntar a staging, pero
# eso es una decisión explícita y no el default.
from pruebas import base_local          # noqa: E402
base_local.usar()

import httpx                                     # noqa: E402
from api import db                               # noqa: E402
from pruebas.test_estado import MAPEADAS, diferencias  # noqa: E402

# Se levanta el servidor DE VERDAD y se le pega por HTTP, en vez de hablarle a
# la aplicación en memoria. Es el camino que va a usar el navegador: HTTP real,
# cookies reales, serialización real. Un test en memoria puede pasar y la cosa
# fallar igual en el primer request de verdad.
def _puerto_libre() -> int:
    """Un puerto que el sistema operativo diga que está libre.

    Clavarlo a mano es frágil: la primera versión usaba el 8765 y en esta
    máquina lo tenía tomado otro servidor de Juani, así que el test daba 404 y
    501 sin que nada estuviera mal en la API.
    """
    import socket
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


PUERTO = _puerto_libre()
BASE = f"http://127.0.0.1:{PUERTO}"


def levantar_servidor():
    import socket
    import subprocess
    import time
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "api.main:app",
         "--host", "127.0.0.1", "--port", str(PUERTO), "--log-level", "warning"],
        cwd=str(AQUI.parent), env=dict(os.environ))
    for _ in range(60):
        try:
            with socket.create_connection(("127.0.0.1", PUERTO), timeout=0.5):
                return proc
        except OSError:
            if proc.poll() is not None:
                sys.exit(f"🔴 el servidor murió al arrancar (código {proc.returncode})")
            time.sleep(0.5)
    proc.terminate()
    sys.exit("🔴 el servidor no levantó en 30 s")

# ⚠️ Se carga `referencia.json.datosNormalizados` y NO `casos.json`.
# `casos.json` es el archivo CRUDO. La app no trabaja con eso: al cargar, su
# `migrar()` lo normaliza (da vuelta las operaciones cargadas al revés, agrega
# marcas suyas, completa campos). Si la base guarda la forma cruda, cada carga
# produce un diff contra lo guardado, y basta que roce un día cerrado para que
# el disparador bloquee CUALQUIER guardado. Pasó exactamente eso.
#
# Regla general que sale de acá, y vale para la carga inicial del cliente:
# **el dato tiene que llegar a la base en su forma final, antes de que se cierre
# ningún día.**
CASOS = json.loads(
    (AQUI / "referencia.json").read_text(encoding="utf-8"))["datosNormalizados"]
resultados: list[tuple[str, bool, str]] = []

# 🔴 Los usuarios de prueba se crean acá y se BORRAN al terminar, con
# contraseñas nuevas en cada corrida.
# El motivo: la primera versión los dejaba dados de alta en la base, y como
# todavía no hay un ambiente de prueba separado, eso era una cuenta de
# ADMINISTRADOR con contraseña conocida contra una URL pública. Lo descubrí
# probando la API de producción de punta a punta, no leyendo el código.
import secrets  # noqa: E402
from api.auth import hashear_clave  # noqa: E402

USUARIOS = {
    "prueba_admin":   {"rol": "admin",   "clave": secrets.token_urlsafe(24)},
    "prueba_lectura": {"rol": "lectura", "clave": secrets.token_urlsafe(24)},
}


def crear_usuarios_de_prueba() -> None:
    with db.pool().connection() as c:
        for nombre, u in USUARIOS.items():
            c.execute("delete from usuario where usuario = %s", (nombre,))
            c.execute("insert into usuario (usuario, nombre, rol, clave_hash) "
                      "values (%s, %s, %s, %s)",
                      (nombre, f"Prueba {u['rol']}", u["rol"], hashear_clave(u["clave"])))


def borrar_usuarios_de_prueba() -> None:
    with db.pool().connection() as c:
        for nombre in USUARIOS:
            c.execute("delete from usuario where usuario = %s", (nombre,))


def check(nombre: str, ok: bool, detalle: str = "") -> None:
    resultados.append((nombre, ok, detalle))
    print(f"  {'✅' if ok else '🔴'} {nombre}" + (f"  → {detalle}" if detalle and not ok else ""))


def main() -> None:
    # Se limpia con DELETE y no con TRUNCATE, y no es un capricho: el rol de la
    # aplicación NO tiene permiso de TRUNCATE, porque TRUNCATE no dispara los
    # disparadores y sería una vía para vaciar tablas sin dejar rastro en la
    # auditoría. Así que hasta el fixture del test pasa por el camino real.
    # El orden importa: los CIERRES primero (reabrir el día), después de hijos a
    # padres. Es la misma restricción que tiene el guardado de verdad.
    with db.pool().connection() as c:
        for t in ("cierre_diario", "pata", "direccion", "operacion", "cable",
                  "movimiento_cc", "gasto", "aporte", "cotizacion", "config",
                  "titular", "sesion"):
            c.execute(f"delete from {t}")
        c.execute("update estado_version set version = 1")
        c.execute("update usuario set intentos_fallidos = 0, bloqueado_hasta = null")

    cli = httpx.Client(base_url=BASE, timeout=30)

    print("\n── Sesión ──")
    r = cli.get("/estado")
    check("sin sesión no se puede leer el estado", r.status_code == 401, str(r.status_code))

    r = cli.post("/sesion", json={"usuario": "prueba_admin", "clave": "mal"})
    check("contraseña incorrecta → 401", r.status_code == 401, str(r.status_code))
    msg_mala = r.json().get("detail")

    r = cli.post("/sesion", json={"usuario": "no-existe-nadie", "clave": "mal"})
    check("usuario inexistente da EL MISMO error (no se puede enumerar)",
          r.status_code == 401 and r.json().get("detail") == msg_mala,
          f"{r.status_code} {r.json().get('detail')!r} vs {msg_mala!r}")

    r = cli.post("/sesion", json={"usuario": "prueba_admin", "clave": USUARIOS["prueba_admin"]["clave"]})
    check("contraseña correcta → entra", r.status_code == 200, r.text[:120])
    check("la respuesta NO trae la contraseña", "clave" not in r.text.lower(), r.text[:120])
    check("la cookie de sesión es httpOnly",
          "httponly" in r.headers.get("set-cookie", "").lower(),
          r.headers.get("set-cookie", ""))

    print("\n── Estado ──")
    r = cli.get("/estado")
    check("con sesión sí se lee", r.status_code == 200, str(r.status_code))
    version = r.json()["version"]
    check("el estado arranca vacío", not r.json()["documento"]["ops"])
    check("los usuarios que vuelven NO traen contraseña",
          all("password" not in u and "clave" not in u
              for u in r.json()["documento"]["usuarios"]))

    r = cli.put("/estado", json={"version": version, "documento": CASOS})
    check("se guarda el estado completo", r.status_code == 200, r.text[:200])
    nueva = r.json().get("version") if r.status_code == 200 else None
    check("la versión avanza", nueva == version + 1, f"{version} → {nueva}")

    r = cli.get("/estado")
    doc = r.json()["documento"]
    difs = []
    for col in MAPEADAS:
        difs += diferencias(CASOS.get(col), doc.get(col), col)
    check("lo que vuelve es idéntico a lo que se guardó",
          not difs, f"{len(difs)} diferencias: {difs[:3]}")

    print("\n── Guardar sin cambios no toca NADA ──")
    # Es el invariante que evita toda una clase de errores: si volver a guardar
    # lo mismo reescribe filas, cada carga choca contra cualquier día cerrado y
    # el sistema deja de poder guardar. Se mide en la AUDITORÍA, que es donde se
    # ve lo que de verdad se escribió.
    with db.pool().connection() as c:
        antes = c.execute("select count(*) from auditoria").fetchone()[0]
    r = cli.put("/estado", json={"version": nueva, "documento": doc})
    check("guardar el mismo documento pasa", r.status_code == 200, r.text[:180])
    if r.status_code == 200:
        nueva = r.json()["version"]
    with db.pool().connection() as c:
        despues = c.execute("select count(*) from auditoria").fetchone()[0]
    check("y NO escribió ni una fila", antes == despues,
          f"la auditoría pasó de {antes} a {despues}: se reescribieron "
          f"{despues - antes} filas que nadie tocó")

    print("\n── Que dos socios no se pisen ──")
    r = cli.put("/estado", json={"version": version, "documento": CASOS})
    check("guardar con una versión vieja → 409, no pisa", r.status_code == 409, str(r.status_code))
    check("y el 409 explica por qué", "guard" in r.text and "cambios" in r.text, r.text[:150])

    print("\n── El día cerrado, desde la API ──")
    doc2 = json.loads(json.dumps(doc))
    # OJO con elegir el caso: `ops[0]` es op1 y es del 2026-08-11, que está
    # ABIERTO. El único del día cerrado es op12. Una primera versión de este
    # test tocaba op1, daba 200 y yo lo leí como "el disparador no anda": el
    # disparador estaba bien y el equivocado era el test.
    cerrada = next(o for o in doc2["ops"] if o["fecha"] == "2026-08-10")
    cerrada["cantidad"] = 999999
    r = cli.put("/estado", json={"version": nueva, "documento": doc2})
    check("modificar una operación de un día cerrado → rechazado",
          r.status_code == 409, str(r.status_code))
    check("y el motivo es legible para una persona",
          "cerrado" in r.text.lower(), r.text[:200])

    doc3 = json.loads(json.dumps(doc))
    doc3["ops"].append({**doc["ops"][1], "id": "nuevo1", "numero": 99,
                        "fecha": "2026-08-11", "cantidad": 10})
    r = cli.put("/estado", json={"version": nueva, "documento": doc3})
    check("pero en un día ABIERTO sí se puede escribir",
          r.status_code == 200, r.text[:200])
    nueva = r.json().get("version", nueva)

    print("\n── Sólo lectura ──")
    cli2 = httpx.Client(base_url=BASE, timeout=30)
    r = cli2.post("/sesion", json={"usuario": "prueba_lectura", "clave": USUARIOS["prueba_lectura"]["clave"]})
    check("el usuario de sólo lectura entra", r.status_code == 200, r.text[:120])
    r = cli2.get("/estado")
    check("y puede LEER", r.status_code == 200, str(r.status_code))
    r = cli2.put("/estado", json={"version": nueva, "documento": doc})
    check("pero NO puede guardar", r.status_code == 403, str(r.status_code))

    print("\n── Bloqueo por intentos ──")
    cli3 = httpx.Client(base_url=BASE, timeout=30)
    codigos = [cli3.post("/sesion", json={"usuario": "prueba_lectura", "clave": "x"}).status_code
               for _ in range(6)]
    check("tras 5 intentos fallidos bloquea (429)", codigos[-1] == 429, str(codigos))
    r = cli3.post("/sesion", json={"usuario": "prueba_lectura", "clave": USUARIOS["prueba_lectura"]["clave"]})
    check("y ni con la contraseña BUENA entra mientras está bloqueado",
          r.status_code == 429, str(r.status_code))
    with db.pool().connection() as c:
        c.execute("update usuario set intentos_fallidos = 0, bloqueado_hasta = null")

    print("\n── Salir ──")
    r = cli.delete("/sesion")
    check("cierra sesión", r.status_code == 200, str(r.status_code))
    r = cli.get("/estado")
    check("y el token deja de servir", r.status_code == 401, str(r.status_code))

    mal = [n for n, ok, _ in resultados if not ok]
    print("\n" + "=" * 72)
    if mal:
        print(f"🔴 {len(mal)} de {len(resultados)} pruebas fallaron")
        sys.exit(1)
    print(f"✅ LAS {len(resultados)} PRUEBAS DE LA API PASAN")
    print("=" * 72)


if __name__ == "__main__":
    crear_usuarios_de_prueba()
    servidor = levantar_servidor()
    try:
        main()
    finally:
        servidor.terminate()
        servidor.wait(timeout=10)
        # Se borran SIEMPRE, aunque el test falle: un usuario de prueba que
        # sobrevive a una corrida es una cuenta con contraseña conocida.
        borrar_usuarios_de_prueba()
