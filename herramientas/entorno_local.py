#!/usr/bin/env python3
"""Levanta el sistema completo contra la base LOCAL, con datos de prueba.

    python3 herramientas/entorno_local.py

Base local descartable + esquema desde los archivos + los 40 casos del arnés
cargados + un usuario para entrar. Sirve para mirar el sistema andando sin tocar
nada remoto.
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

import psycopg                                       # noqa: E402
from pruebas import base_local                       # noqa: E402
from api.auth import hashear_clave                   # noqa: E402
from api.repositorio import asegurar_monedas, guardar_estado  # noqa: E402

USUARIO, CLAVE = "local", "local"


def main() -> None:
    url = base_local.usar()
    casos = json.loads((RAIZ / "pruebas" / "casos.json").read_text(encoding="utf-8"))
    with psycopg.connect(url) as conn:
        with conn.transaction():
            asegurar_monedas(conn, casos)
            guardar_estado(conn, casos, 1, "entorno local")
        conn.execute("delete from usuario where usuario = %s", (USUARIO,))
        conn.execute("insert into usuario (usuario, nombre, rol, clave_hash) "
                     "values (%s, %s, %s, %s)",
                     (USUARIO, "Usuario Local", "admin", hashear_clave(CLAVE)))
    print(f"✅ base local lista, con los 40 casos cargados")
    print(f"   entrar con  {USUARIO} / {CLAVE}")
    print(f"   DATABASE_URL={url}")


if __name__ == "__main__":
    main()
