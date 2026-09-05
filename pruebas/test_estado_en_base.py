#!/usr/bin/env python3
"""La ida y vuelta CONTRA POSTGRES, no en memoria.

`test_estado.py` prueba que el mapeo no pierda nada en Python. Eso no alcanza: la
base tiene tipos propios, y un `numeric` que vuelve como Decimal, un `date` que
vuelve como fecha o un `jsonb` que reordena claves rompen la ida y vuelta igual.
Un dato escrito no es un dato leído.

Corre contra la base LOCAL, con el mismo rol que usa producción.
"""
import json
import sys
from pathlib import Path

AQUI = Path(__file__).parent
sys.path.insert(0, str(AQUI.parent))

import psycopg                                        # noqa: E402
from pruebas import base_local                        # noqa: E402
from api.estado import a_documento, a_filas           # noqa: E402
from api.repositorio import asegurar_monedas, guardar_estado, leer_estado  # noqa: E402
from pruebas.test_estado import MAPEADAS, diferencias # noqa: E402


def main() -> None:
    url = base_local.usar()
    casos = json.loads((AQUI / "casos.json").read_text(encoding="utf-8"))

    print("=" * 72)
    print("IDA Y VUELTA CONTRA POSTGRES (base local)")
    print("=" * 72)

    with psycopg.connect(url) as conn:
        with conn.transaction():
            nuevas = asegurar_monedas(conn, casos)
            if nuevas:
                print(f"  monedas dadas de alta solas: {', '.join(nuevas)}")
            version = guardar_estado(conn, casos, 1, "prueba")
        print(f"  guardado · la versión quedó en {version}")

        filas = a_filas(casos)
        print(f"  {sum(len(v) for v in filas.values())} filas escritas en "
              f"{sum(1 for v in filas.values() if v)} tablas")

        _, vuelta = leer_estado(conn)

    print()
    fallas = []
    for col in MAPEADAS:
        d = diferencias(casos.get(col), vuelta.get(col), col)
        fallas += d
        print(f"  {col:16s} {'✅' if not d else '🔴 ' + str(len(d))}")
    for l in fallas[:20]:
        print(f"     · {l}")

    print()
    print("=" * 72)
    if fallas:
        print(f"🔴 {len(fallas)} diferencia(s): la base NO devuelve lo que le dimos")
        sys.exit(1)
    print("✅ POSTGRES DEVUELVE EXACTAMENTE LO QUE LE DIMOS")
    print("=" * 72)


if __name__ == "__main__":
    main()
