#!/usr/bin/env python3
"""GATE: el port a Python tiene que dar los mismos números que el prototipo.

Compara `api/calculos.py` contra `pruebas/referencia.json`, que salió de ejecutar
el prototipo. Sale con código 1 si algo no coincide, para que sirva de gate.

Qué se compara y qué no, dicho explícitamente:

  · SE COMPARA todo lo que es plata o identidad: id, quién, fecha, moneda, monto,
    efectivo, auto, opId, coll.
  · NO se compara `motivo`, que es un texto de presentación armado con el
    formateador de números del navegador. Reproducirlo en el backend sería poner
    formato local en el lugar equivocado. La API devuelve datos; el texto lo arma
    la pantalla.
  · La ENTRADA son los datos ya normalizados por `migrar()`. Esa normalización es
    trabajo de la API (recibir decimales canónicos), no del cálculo.
"""

import json
import sys
from pathlib import Path

AQUI = Path(__file__).parent
sys.path.insert(0, str(AQUI.parent))

from api import calculos  # noqa: E402

TOL = 1e-9
CAMPOS = ["id", "clienteId", "comisionistaId", "fecha", "moneda", "monto",
          "efectivo", "auto", "opId", "coll"]

fallas: list[str] = []


def igual(a, b) -> bool:
    if isinstance(a, (int, float)) and isinstance(b, (int, float)) \
            and not isinstance(a, bool) and not isinstance(b, bool):
        escala = max(1.0, abs(a), abs(b))
        return abs(a - b) <= TOL * escala
    return a == b


def comparar_dict(nombre, esperado, obtenido):
    for k in sorted(set(esperado) | set(obtenido)):
        e, o = esperado.get(k), obtenido.get(k)
        if not igual(e, o):
            fallas.append(f"{nombre}.{k}: esperado {e!r}, obtuve {o!r}")


def main() -> None:
    ref = json.loads((AQUI / "referencia.json").read_text(encoding="utf-8"))
    d = ref["datosNormalizados"]

    print("=" * 68)
    print("GATE de los cálculos: port en Python contra el prototipo")
    print(f"  referencia generada de: {ref['_meta']['origen']}")
    print(f"  reloj congelado en:     {ref['_meta']['reloj']}")
    print("=" * 68)

    # ── capital ──
    obt = calculos.capital(d)
    comparar_dict("capital", ref["capital"], obt)
    print(f"\n  capital: {'✅' if not fallas else '🔴'}  {obt}")

    # cableCalc no se compara directo: el prototipo no lo expone suelto, y sus
    # montos entran a movimientosCC, así que ahí se valida.
    print("  cableCalc: se valida a través de los montos de movimientosCC")

    # ── movimientosCC ──
    esp_movs = ref["movimientosCC"]
    obt_movs = calculos.movimientos_cc(d)
    print(f"\n  movimientosCC: esperados {len(esp_movs)} · obtenidos {len(obt_movs)}")
    if len(esp_movs) != len(obt_movs):
        fallas.append(f"movimientosCC: cantidad distinta ({len(esp_movs)} vs {len(obt_movs)})")
        ids_e = {m.get("id") for m in esp_movs}
        ids_o = {m.get("id") for m in obt_movs}
        if ids_e - ids_o:
            fallas.append(f"  faltan en el port: {sorted(ids_e - ids_o)}")
        if ids_o - ids_e:
            fallas.append(f"  sobran en el port: {sorted(ids_o - ids_e)}")
    else:
        for i, (e, o) in enumerate(zip(esp_movs, obt_movs)):
            for k in CAMPOS:
                if not igual(e.get(k), o.get(k)):
                    fallas.append(f"movimientosCC[{i}] id={e.get('id')!r} .{k}: "
                                  f"esperado {e.get(k)!r}, obtuve {o.get(k)!r}")

    print("\n" + "=" * 68)
    if fallas:
        print(f"🔴 GATE EN ROJO: {len(fallas)} diferencia(s)\n")
        for f in fallas[:40]:
            print("   " + f)
        if len(fallas) > 40:
            print(f"   … y {len(fallas) - 40} más")
        sys.exit(1)
    print("✅ GATE EN VERDE: el port da exactamente los mismos números que el prototipo")
    print("=" * 68)


if __name__ == "__main__":
    main()
