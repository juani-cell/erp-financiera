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
if not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = os.environ.get("ERP_DATABASE_URL", "")

import httpx                                     # noqa: E402
from api import db                               # noqa: E402
from pruebas.test_estado import MAPEADAS, diferencias  # noqa: E402

# Se levanta el servidor DE VERDAD y se le pega por HTTP, en vez de hablarle a
# la aplicación en memoria. Es el camino que va a usar el navegador: HTTP real,
# cookies reales, serialización real. Un test en memoria puede pasar y la cosa
# fallar igual en el primer request de verdad.
PUERTO = 8765
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

CASOS = json.loads((AQUI / "casos.json").read_text(encoding="utf-8"))
resultados: list[tuple[str, bool, str]] = []


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

    r = cli.post("/sesion", json={"usuario": "tester", "clave": "mal"})
    check("contraseña incorrecta → 401", r.status_code == 401, str(r.status_code))
    msg_mala = r.json().get("detail")

    r = cli.post("/sesion", json={"usuario": "no-existe-nadie", "clave": "mal"})
    check("usuario inexistente da EL MISMO error (no se puede enumerar)",
          r.status_code == 401 and r.json().get("detail") == msg_mala,
          f"{r.status_code} {r.json().get('detail')!r} vs {msg_mala!r}")

    r = cli.post("/sesion", json={"usuario": "tester", "clave": "prueba-e2e-no-usar-en-serio"})
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
    r = cli2.post("/sesion", json={"usuario": "mirona", "clave": "solo-lectura-prueba"})
    check("el usuario de sólo lectura entra", r.status_code == 200, r.text[:120])
    r = cli2.get("/estado")
    check("y puede LEER", r.status_code == 200, str(r.status_code))
    r = cli2.put("/estado", json={"version": nueva, "documento": doc})
    check("pero NO puede guardar", r.status_code == 403, str(r.status_code))

    print("\n── Bloqueo por intentos ──")
    cli3 = httpx.Client(base_url=BASE, timeout=30)
    codigos = [cli3.post("/sesion", json={"usuario": "mirona", "clave": "x"}).status_code
               for _ in range(6)]
    check("tras 5 intentos fallidos bloquea (429)", codigos[-1] == 429, str(codigos))
    r = cli3.post("/sesion", json={"usuario": "mirona", "clave": "solo-lectura-prueba"})
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
    servidor = levantar_servidor()
    try:
        main()
    finally:
        servidor.terminate()
        servidor.wait(timeout=10)
