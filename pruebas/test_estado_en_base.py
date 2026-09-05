#!/usr/bin/env python3
"""La ida y vuelta CONTRA POSTGRES, no en memoria.

`test_estado.py` prueba que el mapeo no pierde nada en Python. Eso no alcanza:
la base tiene tipos propios, y un `numeric` que vuelve como Decimal, un `date`
que vuelve como texto o un `jsonb` que reordena claves rompen la ida y vuelta
igual. Un dato escrito no es un dato leído.

Usa la API de administración de Supabase porque es lo que hay a mano en el
entorno de desarrollo. La API de producción va a hablar por `psycopg` directo.

⚠️ Se llama con `curl` a propósito: Cloudflare bloquea el User-Agent de Python
delante de esta API y devuelve 403 con "error code: 1010", sin explicar nada.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

AQUI = Path(__file__).parent
sys.path.insert(0, str(AQUI.parent))
from api.estado import a_documento, a_filas          # noqa: E402
from pruebas.test_estado import MAPEADAS, diferencias  # noqa: E402

REF = os.environ.get("SUPABASE_ERP_REF")
TOK = os.environ.get("SUPABASE_ACCESS_TOKEN")

# El orden importa dos veces: por las claves foráneas, y porque `cierre_diario`
# va ÚLTIMO. Cerrar un día antes de cargar sus operaciones hace que el propio
# disparador de día cerrado bloquee la carga. Es la misma restricción que va a
# tener el importador de la carga inicial.
ORDEN = ["titular", "direccion", "operacion", "cable", "pata",
         "movimiento_cc", "gasto", "aporte", "cotizacion", "config", "cierre_diario"]

JSONB = {"config": {"valor"}, "cierre_diario": {"params"}, "cotizacion": {"valores"}}


def sql(consulta: str):
    if not REF or not TOK:
        sys.exit("faltan SUPABASE_ERP_REF y SUPABASE_ACCESS_TOKEN (source ~/.zshrc)")
    payload = json.dumps({"query": consulta})
    r = subprocess.run(
        ["curl", "-s", "-X", "POST",
         f"https://api.supabase.com/v1/projects/{REF}/database/query",
         "-H", f"Authorization: Bearer {TOK}",
         "-H", "Content-Type: application/json", "--data-binary", "@-"],
        input=payload, capture_output=True, text=True)
    out = json.loads(r.stdout or "{}")
    if isinstance(out, dict) and "message" in out:
        raise RuntimeError(out["message"][:400])
    return out


def lit(v, es_json=False):
    if v is None:
        return "null"
    if es_json:
        return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def main() -> None:
    casos = json.loads((AQUI / "casos.json").read_text(encoding="utf-8"))
    filas = a_filas(casos)

    print("=" * 72)
    print("IDA Y VUELTA CONTRA POSTGRES")
    print("=" * 72)

    print("  vaciando las tablas…")
    sql("truncate " + ", ".join(ORDEN) + " restart identity cascade")

    # Las monedas que el documento usa y la tabla todavía no conoce se dan de
    # alta solas: la tabla aprende de los datos en vez de rechazarlos.
    usadas = {f["moneda"] for f in filas["pata"]} | {f["moneda"] for f in filas["gasto"]} \
        | {f["moneda"] for f in filas["aporte"]} | {f["moneda"] for f in filas["movimiento_cc"]} \
        | {f["moneda"] for f in filas["operacion"]} | {f["moneda_pago"] for f in filas["operacion"]}
    conocidas = {r["codigo"] for r in sql("select codigo from moneda")}
    nuevas = sorted(m for m in usadas if m and m not in conocidas)
    if nuevas:
        sql("insert into moneda (codigo, nombre) values " +
            ", ".join(f"({lit(m)}, {lit(m)})" for m in nuevas))
        print(f"  monedas nuevas dadas de alta: {', '.join(nuevas)}")

    total = 0
    for tabla in ORDEN:
        rows = filas.get(tabla) or []
        if not rows:
            continue
        cols = list(rows[0].keys())
        js = JSONB.get(tabla, set())
        valores = ", ".join(
            "(" + ", ".join(lit(r.get(c), c in js) for c in cols) + ")" for r in rows)
        sql(f"insert into {tabla} ({', '.join(cols)}) values {valores}")
        total += len(rows)
        print(f"  {tabla:16s} {len(rows):>3} filas escritas")
    print(f"  {'':16s} {total:>3} filas en total")

    print()
    print("  leyendo de vuelta…")
    leidas = {t: sql(f"select * from {t}") for t in ORDEN}
    vuelta = a_documento(leidas)

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
