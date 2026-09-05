#!/usr/bin/env python3
"""El sistema completo contra la base LOCAL, en UN solo proceso.

    .venv/bin/python herramientas/servir_local.py     → http://127.0.0.1:8801

Entrar con `local` / `local`. No toca nada remoto.

⚠️ La base y el servidor van en el MISMO proceso a propósito: el Postgres
embebido vive mientras viva quien lo abrió, así que si la preparación fuera un
script aparte, la base se apagaría justo antes de que arranque la API. Pasó, y
el síntoma era un 500 con "no such file or directory" sobre el socket.
"""
import json
import os
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
os.environ["ENTORNO"] = "desarrollo"
os.environ.pop("DATABASE_URL", None)
os.environ.pop("ERP_DATABASE_URL", None)

import psycopg                                        # noqa: E402
from pruebas import base_local                        # noqa: E402

USUARIO, CLAVE, PUERTO = "local", "local", 8801


def main() -> None:
    url = base_local.usar()
    from api.auth import hashear_clave                     # noqa: E402
    from api.repositorio import asegurar_monedas, guardar_estado  # noqa: E402

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
    casos = json.loads(
        (RAIZ / "pruebas" / "referencia.json").read_text(encoding="utf-8")
    )["datosNormalizados"]
    with psycopg.connect(url) as conn:
        with conn.transaction():
            asegurar_monedas(conn, casos)
            guardar_estado(conn, casos, 1, "entorno local")
        conn.execute("delete from usuario where usuario = %s", (USUARIO,))
        conn.execute("insert into usuario (usuario, nombre, rol, clave_hash) "
                     "values (%s, %s, %s, %s)",
                     (USUARIO, "Usuario Local", "admin", hashear_clave(CLAVE)))

    print(f"\n  ✅ base local con los 40 casos cargados")
    print(f"     http://127.0.0.1:{PUERTO}   ·   entrar con  {USUARIO} / {CLAVE}\n")

    import uvicorn
    from api.main import app
    uvicorn.run(app, host="127.0.0.1", port=PUERTO, log_level="info")


if __name__ == "__main__":
    main()
