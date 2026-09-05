"""API del ERP Financiera.

Toda regla de negocio vive acá, nunca en las pantallas. El motivo no es estético:
está planeado un acceso por chat (MCP) que es una capa fina sobre esta API, así
que si un cálculo viviera en la pantalla, el chatbot daría un número distinto al
que muestra el sistema.
"""

import logging
import os

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from pydantic import BaseModel

from . import auth, db, repositorio

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("erp")

ENTORNO = os.getenv("ENTORNO", "produccion")
_es_desarrollo = ENTORNO == "desarrollo"

# La documentación de la API NO se publica en producción.
# Lección ajena que no vamos a repetir: el ERP de Alaska exponía /docs y
# /openapi.json abiertos, y con eso cualquiera leía el plano completo del
# sistema sin poner una credencial.
app = FastAPI(
    title="ERP Financiera · API",
    docs_url="/docs" if _es_desarrollo else None,
    redoc_url=None,
    openapi_url="/openapi.json" if _es_desarrollo else None,
)


@app.api_route("/health", methods=["GET", "HEAD"], include_in_schema=False)
def health() -> Response:
    """Salud del servicio, para el monitor externo.

    Dos decisiones que vienen de errores ya pagados:

    · Responde **HEAD** además de GET. UptimeRobot consulta con HEAD, y un
      endpoint que sólo implementa GET queda DOWN para siempre: alerta falsa
      permanente, que es peor que no tener alerta.
    · Devuelve **503** cuando algo está mal, no 200 con un estado en el cuerpo.
      El plan gratuito de UptimeRobot sólo entiende códigos HTTP.
    """
    try:
        db.ping()
    except Exception as e:  # noqa: BLE001 — cualquier falla acá es "no estoy sano"
        log.error("health: la base no responde: %s", e)
        return Response(status_code=503, content="base no responde")
    return Response(status_code=200, content="ok")


# ════════════════════════════════════════════════════════════════════════════
# Sesión
# ════════════════════════════════════════════════════════════════════════════

COOKIE = "erp_sesion"


class Credenciales(BaseModel):
    usuario: str
    clave: str


def _usuario_de_sesion(conn, token: str | None) -> dict | None:
    if not token:
        return None
    fila = conn.execute(
        "select u.id, u.usuario, u.nombre, u.rol, s.vence_en "
        "from sesion s join usuario u on u.id = s.usuario_id "
        "where s.token_hash = %s and u.estado = 'activo'",
        (auth.hash_token(token),)).fetchone()
    if not fila:
        return None
    if fila[4] <= auth.ahora():
        # Vencida: se borra al pasar, así la tabla no acumula sesiones muertas.
        conn.execute("delete from sesion where token_hash = %s", (auth.hash_token(token),))
        return None
    conn.execute("update sesion set ultima_actividad = now() where token_hash = %s",
                 (auth.hash_token(token),))
    return {"id": fila[0], "usuario": fila[1], "nombre": fila[2], "rol": fila[3]}


def sesion_actual(peticion: Request) -> dict:
    """Dependencia: exige sesión válida o corta con 401."""
    token = peticion.cookies.get(COOKIE)
    if not token:
        cabecera = peticion.headers.get("authorization") or ""
        if cabecera.lower().startswith("bearer "):
            token = cabecera[7:]
    with db.pool().connection() as conn:
        u = _usuario_de_sesion(conn, token)
    if not u:
        raise HTTPException(status_code=401, detail="sesión inválida o vencida")
    return u


@app.post("/sesion")
def entrar(cred: Credenciales, respuesta: Response) -> dict:
    """Login.

    El mensaje de error es el MISMO para usuario inexistente y para contraseña
    equivocada. Si fueran distintos, cualquiera podría averiguar qué usuarios
    existen probando nombres, que es el primer paso de un ataque.
    """
    generico = HTTPException(status_code=401, detail="usuario o contraseña incorrectos")
    with db.pool().connection() as conn:
        fila = conn.execute(
            "select id, clave_hash, estado, intentos_fallidos, bloqueado_hasta, nombre, rol "
            "from usuario where usuario = %s", (cred.usuario,)).fetchone()

        if not fila:
            # Se deriva igual contra un hash descartable: sin esto, un usuario
            # inexistente contesta en 1 ms y uno real en 31 ms, y esa diferencia
            # sola ya revela cuáles existen.
            auth.verificar_clave(cred.clave, auth.hashear_clave("nadie"))
            raise generico

        uid, clave_hash, estado, intentos, bloqueado, nombre, rol = fila

        if bloqueado and bloqueado > auth.ahora():
            raise HTTPException(
                status_code=429,
                detail="demasiados intentos fallidos, probá de nuevo en un rato")

        if estado != "activo":
            raise HTTPException(status_code=403, detail="usuario desactivado")

        if not auth.verificar_clave(cred.clave, clave_hash):
            intentos += 1
            hasta = (auth.ahora() + auth.BLOQUEO
                     if intentos >= auth.INTENTOS_ANTES_DE_BLOQUEAR else None)
            conn.execute(
                "update usuario set intentos_fallidos = %s, bloqueado_hasta = %s where id = %s",
                (intentos, hasta, uid))
            # ⚠️ El commit va ANTES de lanzar el error, y no es prolijidad: la
            # excepción cierra la conexión con rollback, así que sin esto el
            # incremento que acabamos de escribir se revierte y el bloqueo por
            # intentos NUNCA se activa. Lo encontró el test de punta a punta.
            conn.commit()
            log.warning("login fallido para %r (intento %d)", cred.usuario, intentos)
            raise generico

        token = auth.nuevo_token()
        conn.execute(
            "insert into sesion (token_hash, usuario_id, vence_en) values (%s, %s, %s)",
            (auth.hash_token(token), uid, auth.vencimiento()))
        conn.execute(
            "update usuario set intentos_fallidos = 0, bloqueado_hasta = null, "
            "ultimo_ingreso = now() where id = %s", (uid,))

    respuesta.set_cookie(
        COOKIE, token,
        httponly=True,      # el JavaScript de la página no lo puede leer
        secure=not _es_desarrollo,
        samesite="lax",
        max_age=int(auth.DURACION_SESION.total_seconds()))
    log.info("entró %r (%s)", cred.usuario, rol)
    return {"usuario": cred.usuario, "nombre": nombre, "rol": rol}


@app.delete("/sesion")
def salir(peticion: Request, respuesta: Response) -> dict:
    token = peticion.cookies.get(COOKIE)
    if token:
        with db.pool().connection() as conn:
            conn.execute("delete from sesion where token_hash = %s",
                         (auth.hash_token(token),))
    respuesta.delete_cookie(COOKIE)
    return {"listo": True}


# ════════════════════════════════════════════════════════════════════════════
# El estado
# ════════════════════════════════════════════════════════════════════════════

class EstadoEntrante(BaseModel):
    version: int
    documento: dict


@app.get("/estado")
def obtener_estado(usuario: dict = Depends(sesion_actual)) -> dict:
    with db.pool().connection() as conn:
        version, doc = repositorio.leer_estado(conn)
    # Los usuarios NUNCA viajan con su contraseña. La UI sólo necesita saber
    # quién es el que está adentro para decidir qué muestra.
    doc["usuarios"] = [{"id": usuario["id"], "usuario": usuario["usuario"],
                        "nombre": usuario["nombre"], "rol": usuario["rol"],
                        "estado": "activo"}]
    doc["operador"] = usuario["nombre"]
    return {"version": version, "documento": doc, "usuario": usuario}


@app.put("/estado")
def guardar(entrante: EstadoEntrante, usuario: dict = Depends(sesion_actual)) -> dict:
    if usuario["rol"] == "lectura":
        raise HTTPException(status_code=403, detail="tu usuario es de sólo lectura")
    try:
        with db.pool().connection() as conn:
            with conn.transaction():
                nuevas = repositorio.asegurar_monedas(conn, entrante.documento)
                version = repositorio.guardar_estado(
                    conn, entrante.documento, entrante.version, usuario["usuario"])
        if nuevas:
            log.info("monedas dadas de alta: %s", ", ".join(nuevas))
        return {"version": version}
    except repositorio.ConflictoDeVersion as e:
        # 409 y no 500: no es un error del sistema, es que otra persona guardó
        # primero. La UI tiene que recargar y avisarle a quien está mirando.
        raise HTTPException(
            status_code=409,
            detail={"motivo": "alguien más guardó cambios mientras editabas",
                    "version_actual": e.actual, "version_enviada": e.enviada}) from e
    except Exception as e:  # noqa: BLE001
        # Los disparadores de la base (día cerrado) llegan acá. El motivo que
        # escriben es para leer, así que se devuelve tal cual.
        msg = str(getattr(e, "diag", None) and e.diag.message_primary or e)
        log.warning("guardado rechazado: %s", msg[:200])
        raise HTTPException(status_code=409, detail={"motivo": msg[:300]}) from e
