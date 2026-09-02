"""API del ERP Financiera.

Toda regla de negocio vive acá, nunca en las pantallas. El motivo no es estético:
está planeado un acceso por chat (MCP) que es una capa fina sobre esta API, así
que si un cálculo viviera en la pantalla, el chatbot daría un número distinto al
que muestra el sistema.
"""

import logging
import os

from fastapi import FastAPI, Response

from . import db

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
