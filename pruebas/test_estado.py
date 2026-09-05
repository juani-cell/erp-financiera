#!/usr/bin/env python3
"""¿El estado del prototipo sobrevive el viaje a nuestras tablas?

La UI que reusamos manda su estado entero y espera recibirlo igual. Lo que la
base no sepa reproducir se pierde en el PRIMER guardado, sin error y sin aviso:
el usuario ve un campo vacío y no hay nada en ningún log que lo explique.

Dos pruebas, y la segunda es la que importa:

  1. FORMA:     documento -> filas -> documento tiene que dar idéntico.
  2. SIGNIFICADO: correr los cálculos sobre el documento que volvió tiene que
     dar los MISMOS NÚMEROS que el prototipo. Una ida y vuelta puede quedar
     idéntica en la forma y aun así haber movido algo que cambia una cuenta.

La 2 reusa la referencia dorada del arnés, así que no depende de que yo haya
entendido bien: depende de lo que el prototipo realmente calcula.
"""
import json
import sys
from pathlib import Path

AQUI = Path(__file__).parent
sys.path.insert(0, str(AQUI.parent))

from api import calculos                     # noqa: E402
from api.estado import a_documento, a_filas   # noqa: E402

# `usuarios`, `audit` y `operador` no viajan a propósito: los primeros dos
# tienen su propio lugar (autenticación y auditoría de la base) y el tercero
# sale de la sesión. Las banderas del reseteo del prototipo tampoco.
MAPEADAS = ["clientes", "comisionistas", "ops", "cripto", "mayoristaOps",
            "cables", "ctacte", "gastos", "aportes", "cierres", "cotiz", "params"]


def _es_numero(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def diferencias(a, b, ruta=""):
    # Entero contra decimal NO es una diferencia, y no es una concesión para que
    # el test pase: quien consume esto es JavaScript, que tiene UN SOLO tipo de
    # número. Verificado en el navegador: `JSON.parse('1.0') === JSON.parse('1')`
    # da true, y el propio navegador reserializa 1.0 como 1, así que el
    # prototipo escribiría exactamente lo mismo que nosotros. La distinción sólo
    # existe en Python. Los VALORES sí se comparan, con tolerancia relativa.
    if _es_numero(a) and _es_numero(b):
        if abs(a - b) > max(1e-9 * max(abs(a), abs(b)), 1e-9):
            return [f"{ruta}: {a} -> {b}"]
        return []
    if type(a) is not type(b):
        return [f"{ruta}: {type(a).__name__} -> {type(b).__name__}"]
    out = []
    if isinstance(a, dict):
        for k in dict.fromkeys(list(a) + list(b)):
            if k not in a:
                out.append(f"{ruta}.{k}: SOBRA -> {json.dumps(b[k], ensure_ascii=False)[:40]}")
            elif k not in b:
                out.append(f"{ruta}.{k}: SE PERDIÓ (era {json.dumps(a[k], ensure_ascii=False)[:40]})")
            else:
                out += diferencias(a[k], b[k], f"{ruta}.{k}")
    elif isinstance(a, list):
        if len(a) != len(b):
            out.append(f"{ruta}: eran {len(a)} y volvieron {len(b)}")
        else:
            for i, (u, v) in enumerate(zip(a, b)):
                out += diferencias(u, v, f"{ruta}[{i}]")
    elif isinstance(a, float) and isinstance(b, float):
        if abs(a - b) > max(1e-9 * max(abs(a), abs(b)), 1e-9):
            out.append(f"{ruta}: {a} -> {b}")
    elif a != b:
        out.append(f"{ruta}: {json.dumps(a, ensure_ascii=False)[:38]} -> "
                   f"{json.dumps(b, ensure_ascii=False)[:38]}")
    return out


def main() -> None:
    casos = json.loads((AQUI / "casos.json").read_text(encoding="utf-8"))
    ref = json.loads((AQUI / "referencia.json").read_text(encoding="utf-8"))

    print("=" * 72)
    print("1 · FORMA · ¿el documento vuelve idéntico?")
    print("=" * 72)
    vuelta = a_documento(a_filas(casos))
    fallas = []
    for col in MAPEADAS:
        d = diferencias(casos.get(col), vuelta.get(col), col)
        fallas += d
        print(f"  {col:16s} {'✅' if not d else '🔴 ' + str(len(d)) + ' diferencias'}")
    for l in fallas[:15]:
        print(f"     · {l}")

    print()
    print("=" * 72)
    print("2 · EL DOCUMENTO QUE LA APP REALMENTE MANDA")
    print("=" * 72)
    # `casos.json` es el archivo crudo. La app NO manda eso: manda lo que su
    # propia migración produce al cargar (da vuelta operaciones cargadas al
    # revés, agrega marcas suyas, completa campos). Probar sólo el archivo crudo
    # dejó pasar 41 campos que se perdían, y cada uno genera un diff fantasma en
    # cada carga: si roza un día cerrado, bloquea TODO guardado.
    norm = ref["datosNormalizados"]
    vuelta_n = a_documento(a_filas(norm))
    for col in MAPEADAS:
        d = diferencias(norm.get(col), vuelta_n.get(col), col)
        fallas += d
        print(f"  {col:16s} {'✅' if not d else '🔴 ' + str(len(d)) + ' diferencias'}")
    for l in [x for x in fallas if x.startswith(tuple(MAPEADAS))][:12]:
        print(f"     · {l}")

    print()
    print("=" * 72)
    print("3 · SIGNIFICADO · ¿los cálculos dan lo mismo sobre el documento que volvió?")
    print("=" * 72)
    d0 = norm
    d1 = vuelta_n
    # Lo que no viaja se repone tal cual estaba: el test mide el mapeo, no la
    # ausencia de cosas que ya sabemos que no van por acá.
    for k, v in d0.items():
        d1.setdefault(k, v)

    for nombre, fn in (("capital", calculos.capital),
                       ("movimientosCC", calculos.movimientos_cc),
                       ("serie", calculos.serie)):
        esperado, obtenido = fn(d0), fn(d1)
        d = diferencias(esperado, obtenido, nombre)
        fallas += d
        print(f"  {nombre:16s} {'✅ mismos números' if not d else '🔴 ' + str(len(d)) + ' diferencias'}")
        for l in d[:6]:
            print(f"     · {l}")

    tc = (calculos.serie(d0)["rows"] or [{}])[-1].get("tc") or 1
    esperado, obtenido = calculos.cuentas(d0, tc), calculos.cuentas(d1, tc)
    d = diferencias(esperado, obtenido, "cuentas")
    fallas += d
    print(f"  {'cuentas':16s} {'✅ mismos números' if not d else '🔴 ' + str(len(d)) + ' diferencias'}")
    for l in d[:6]:
        print(f"     · {l}")

    print()
    print("=" * 72)
    if fallas:
        print(f"🔴 {len(fallas)} diferencia(s): el estado NO sobrevive el viaje")
        sys.exit(1)
    print("✅ EL ESTADO SOBREVIVE: vuelve idéntico y da los mismos números")
    print("=" * 72)


if __name__ == "__main__":
    main()
