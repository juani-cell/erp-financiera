"""Copia propia de la base, fuera de la plataforma.

Por qué existe, porque no es redundante con los respaldos de Supabase:
  · los respaldos físicos de Supabase NO se pueden descargar
  · no incluyen los archivos adjuntos
  · y si el proyecto se borra, SE BORRAN CON ÉL

O sea que sin esta copia, un borrado del proyecto es irrecuperable.

Corre como cron, no como proceso encendido. Dos razones: cuesta unas treinta veces
menos, y sobre todo, si una corrida se cuelga la siguiente arranca limpia.
"""

from __future__ import annotations

import datetime as dt
import logging
import os
import subprocess
import sys
import tempfile
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("respaldo")

# Mínimos para considerar un volcado creíble. Un archivo de 200 bytes es un
# volcado vacío que "salió bien", y es la forma más común de respaldo inútil.
MIN_BYTES = 5_000
MIN_TABLAS = 1
RETENCION_DIAS = int(os.getenv("RETENCION_DIAS", "30"))


def _falla(msg: str) -> None:
    """Sale con error para que la corrida quede marcada como fallida.

    No se traga la excepción a propósito: un respaldo que falla en silencio es
    peor que no tener respaldo, porque genera confianza infundada.
    """
    log.error(msg)
    sys.exit(1)


def volcar(url: str, destino: Path) -> None:
    """pg_dump en formato custom, que es el que pg_restore puede usar selectivamente."""
    cmd = [
        "pg_dump", url,
        "--format=custom",
        "--no-owner", "--no-privileges",
        "--file", str(destino),
    ]
    log.info("volcando la base…")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        _falla(f"pg_dump falló (código {r.returncode}): {r.stderr.strip()[:500]}")


def verificar(archivo: Path) -> int:
    """Confirma que el volcado sirve. Devuelve la cantidad de tablas que trae.

    Esta función es el corazón del script: generar el archivo no prueba nada, y
    subir un volcado roto es la falla silenciosa más cara de un sistema de
    respaldos. Acá se mide el ARTEFACTO, no el código de salida de pg_dump.
    """
    if not archivo.exists():
        _falla("el volcado no existe")
    tam = archivo.stat().st_size
    if tam < MIN_BYTES:
        _falla(f"el volcado pesa {tam} bytes, menos del mínimo creíble ({MIN_BYTES})")

    # pg_restore --list lee el índice interno del volcado: si el archivo está
    # truncado o corrupto, esto falla acá y no en el día que haya que restaurar.
    r = subprocess.run(["pg_restore", "--list", str(archivo)], capture_output=True, text=True)
    if r.returncode != 0:
        _falla(f"el volcado no se puede leer con pg_restore: {r.stderr.strip()[:300]}")

    tablas = [l for l in r.stdout.splitlines() if " TABLE DATA " in l]
    if len(tablas) < MIN_TABLAS:
        _falla(f"el volcado trae {len(tablas)} tablas con datos, menos del mínimo ({MIN_TABLAS})")

    log.info("volcado verificado: %s bytes · %s tablas con datos", f"{tam:,}", len(tablas))
    return len(tablas)


def subir(archivo: Path, nombre: str) -> str | None:
    """Sube a almacenamiento compatible con S3 (Cloudflare R2, Backblaze B2, S3).

    Si no hay credenciales configuradas, no sube y lo dice. No inventa un destino
    ni finge éxito: la corrida queda como 'volcado verificado, sin subir'.
    """
    bucket = os.getenv("RESPALDO_BUCKET")
    endpoint = os.getenv("RESPALDO_ENDPOINT")
    if not bucket or not endpoint:
        log.warning("sin destino configurado (RESPALDO_BUCKET / RESPALDO_ENDPOINT): NO se subió")
        return None

    import boto3

    s3 = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=os.environ["RESPALDO_KEY_ID"],
        aws_secret_access_key=os.environ["RESPALDO_KEY_SECRET"],
        region_name=os.getenv("RESPALDO_REGION", "auto"),
    )
    s3.upload_file(str(archivo), bucket, nombre)

    # Verificar que del otro lado esté, y del tamaño correcto. Subir sin
    # confirmar es la misma clase de error que volcar sin verificar.
    head = s3.head_object(Bucket=bucket, Key=nombre)
    if head["ContentLength"] != archivo.stat().st_size:
        _falla("el archivo subido no coincide en tamaño con el local")
    log.info("subido y confirmado: %s (%s bytes)", nombre, f"{head['ContentLength']:,}")

    purgar(s3, bucket)
    return nombre


def purgar(s3, bucket: str) -> None:
    """Borra los respaldos más viejos que RETENCION_DIAS.

    Va acá y no en un script aparte por una razón: si nada purga un recurso que
    crece, es un incidente agendado. El almacenamiento se llena en silencio y el
    día que se llena, los respaldos dejan de subirse.
    """
    corte = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=RETENCION_DIAS)
    borrados = 0
    paginador = s3.get_paginator("list_objects_v2")
    for pagina in paginador.paginate(Bucket=bucket, Prefix="erp-financiera/"):
        for obj in pagina.get("Contents", []):
            if obj["LastModified"] < corte:
                s3.delete_object(Bucket=bucket, Key=obj["Key"])
                borrados += 1
    log.info("purga: %s respaldos con más de %s días borrados", borrados, RETENCION_DIAS)


def main() -> None:
    url = os.getenv("DATABASE_URL")
    if not url:
        _falla("falta DATABASE_URL")

    sello = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H%M%SZ")
    nombre = f"erp-financiera/{sello}.dump"

    with tempfile.TemporaryDirectory() as tmp:
        archivo = Path(tmp) / "volcado.dump"
        volcar(url, archivo)
        tablas = verificar(archivo)
        subido = subir(archivo, nombre)

    if subido:
        log.info("✅ respaldo completo: %s · %s tablas", subido, tablas)
    else:
        log.warning("⚠️ volcado verificado pero NO subido: falta configurar el destino")


if __name__ == "__main__":
    main()
