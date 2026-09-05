#!/usr/bin/env python3
"""Da de alta un usuario del ERP.

    python3 herramientas/crear_usuario.py <usuario> "<Nombre Apellido>" <rol>

La contraseña NO se pide por teclado ni se pasa por argumento: se genera acá y
se muestra UNA sola vez. Dos motivos:
  · una contraseña pasada por argumento queda en el historial del shell;
  · una elegida por una persona apurada es la que después se adivina.

Roles: admin | operador | lectura
"""
import os
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import psycopg                      # noqa: E402
from api.auth import hashear_clave  # noqa: E402

ROLES = ("admin", "operador", "lectura")


def main() -> None:
    if len(sys.argv) != 4 or sys.argv[3] not in ROLES:
        sys.exit(__doc__)
    usuario, nombre, rol = sys.argv[1:4]
    url = os.environ.get("DATABASE_URL") or os.environ.get("ERP_DATABASE_URL")
    if not url:
        sys.exit("falta DATABASE_URL (o ERP_DATABASE_URL)")

    clave = os.environ.get("CLAVE_FIJA") or secrets.token_urlsafe(12)
    with psycopg.connect(url) as conn:
        ya = conn.execute("select 1 from usuario where usuario = %s", (usuario,)).fetchone()
        if ya:
            sys.exit(f"🔴 el usuario {usuario!r} ya existe")
        conn.execute(
            "insert into usuario (usuario, nombre, rol, clave_hash) values (%s, %s, %s, %s)",
            (usuario, nombre, rol, hashear_clave(clave)))
    print(f"✅ usuario {usuario!r} creado con rol {rol}")
    print(f"   contraseña: {clave}")
    print("   ⚠️ Se muestra una sola vez. Guardala en el gestor de contraseñas ahora.")


if __name__ == "__main__":
    main()
