"""Una base de datos LOCAL y descartable para las pruebas.

Existe por un error concreto: las pruebas corrían contra la misma base que sirve
la URL pública, y así dejé una cuenta de administrador con contraseña conocida
en internet. Un resto de un test no puede ser una exposición real.

Tres propiedades que importan, en este orden:

1. **Aislada.** Nada de lo que haga una prueba puede tocar lo que ve un cliente.
2. **Gratis y sin red.** Un Postgres de verdad, embebido, que arranca en
   segundos. No hace falta pagar un segundo proyecto para tener aislamiento.
3. **Con el MISMO rol que producción.** Las pruebas se conectan como `erp_app`,
   no como superusuario, porque los permisos son parte de lo que hay que probar:
   si el test corriera como dueño de las tablas, "la auditoría no se puede
   borrar" daría verde sin significar nada.

⚠️ El directorio de datos NO va en el scratchpad de la sesión: ese directorio se
borra entre sesiones y nos dejaría sin cluster a mitad de una corrida.
"""
from __future__ import annotations

import os
from pathlib import Path

import pgserver
import psycopg

PGDATA = Path.home() / ".cache" / "erp-financiera" / "pgdata"
ESQUEMA = Path(__file__).parent.parent / "esquema"
CLAVE_APP = "prueba-local"          # base local, sin red: no es un secreto


def arrancar(recrear: bool = True) -> str:
    """Levanta la base local y devuelve la URL con la que se conecta la API.

    Con `recrear=True` (el default) el esquema se rehace desde los archivos en
    cada corrida. Es lo correcto: además de dejar las pruebas en un estado
    conocido, verifica en cada corrida que **los archivos del repo alcanzan para
    reconstruir la base**. Una migración que quedó sólo aplicada a mano falla acá
    y no el día que haya que rearmar algo en serio.
    """
    PGDATA.mkdir(parents=True, exist_ok=True)
    db = pgserver.get_server(str(PGDATA))
    uri = db.get_uri()          # postgresql://postgres@/postgres?host=/tmp/...

    if recrear:
        # ⚠️ Las migraciones se aplican con psycopg y NO con `db.psql()`.
        # `db.psql()` devuelve cadena VACÍA cuando el comando falla: escribe el
        # error por otro lado y sigue. Con eso, esta función reportaba "base
        # lista" con una migración rota adentro, que es el mismo agujero que ya
        # tapé en el generador de la referencia. psycopg lanza excepción.
        import psycopg
        with psycopg.connect(uri, autocommit=True) as conn:
            conn.execute("drop schema if exists public cascade")
            conn.execute("create schema public")
            # `erp_app` es un rol del CLUSTER, así que sobrevive al drop del
            # esquema: se crea la primera vez y después sólo se le refresca la
            # clave.
            conn.execute(f"""
                do $$ begin
                  if not exists (select 1 from pg_roles where rolname = 'erp_app') then
                    create role erp_app login password '{CLAVE_APP}';
                  else
                    alter role erp_app login password '{CLAVE_APP}';
                  end if;
                end $$""")
            for archivo in sorted(ESQUEMA.glob("0*.sql")):
                if "probar" in archivo.name:
                    continue
                try:
                    conn.execute(archivo.read_text(encoding="utf-8"))
                except Exception as e:
                    raise RuntimeError(
                        f"la migración {archivo.name} falló: {e}") from e

    # ⚠️ La URI de pgserver viene como `postgresql://postgres:@/...` (con dos
    # puntos), así que un reemplazo de "postgres@" no engancha y la conexión
    # quedaba como SUPERUSUARIO sin que nada avisara. Con eso, "la auditoría no
    # se puede borrar" daría verde sin significar nada: el dueño de las tablas
    # puede todo. Por eso además de armar la URL, se VERIFICA el rol.
    import re
    url = re.sub(r"^postgresql://postgres:?@",
                 f"postgresql://erp_app:{CLAVE_APP}@", uri)
    with psycopg.connect(url) as conn:
        rol = conn.execute("select current_user").fetchone()[0]
    if rol != "erp_app":
        raise RuntimeError(
            f"la base local quedó conectada como {rol!r} y no como 'erp_app'. "
            "Las pruebas de permisos no probarían nada.")
    return url


def usar() -> str:
    """Deja `DATABASE_URL` apuntando a la base local y devuelve la URL.

    Si ya viene puesta a mano se respeta: sirve para correr las mismas pruebas
    contra staging cuando hace falta, pero eso es una decisión explícita y no
    el default.
    """
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]
    url = arrancar()
    os.environ["DATABASE_URL"] = url
    return url


if __name__ == "__main__":
    import time
    t0 = time.time()
    url = arrancar()
    print(f"✅ base local lista en {time.time() - t0:.1f} s")
    print(f"   {url.split('@')[1] if '@' in url else url}")
