#!/usr/bin/env python3
"""Genera la REFERENCIA DORADA del arnés de regresión.

Corre los cálculos del **prototipo** contra `casos.json` y guarda el resultado en
`referencia.json`. Esa referencia es la fuente de verdad contra la que se compara
el port a Python.

Por qué se hace así y no leyendo el código: si yo escribo el port y el test
leyendo lo mismo, un malentendido mío pasa las dos pruebas. La referencia tiene
que salir del artefacto ejecutándose.

Efecto lateral valioso: cuando Agus cambia el prototipo, volver a correr esto y
mirar el diff de `referencia.json` **muestra exactamente qué cálculo cambió**.

Uso:  python3 generar_referencia.py /ruta/al/repo/del/prototipo
"""

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

AQUI = Path(__file__).parent
RELOJ_FIJO = "2026-08-12T12:00:00Z"

# Cálculos a capturar. Los nombres salen de leer el prototipo, pero los VALORES
# salen de ejecutarlo. Si el prototipo renombra uno, esto falla ruidosamente en
# vez de comparar contra nada, que es lo que queremos.
CALCULOS = ["capital", "serie", "movimientosCC"]


def hallar_prototipo(base: Path) -> Path:
    cands = sorted(base.glob("*.dc.html"))
    if not cands:
        sys.exit(f"no encontré ningún .dc.html en {base}")
    if len(cands) > 1:
        print(f"  aviso: hay {len(cands)} archivos .dc.html, uso {cands[0].name}")
    return cands[0]


def extraer_script(html: str) -> str:
    """Saca el bloque de código del prototipo buscándolo, no por número de línea."""
    m = re.search(r'<script[^>]*data-dc-script[^>]*>(.*?)</script>', html, re.S)
    if not m:
        sys.exit("no encontré el bloque <script data-dc-script> en el prototipo")
    return m.group(1)


ANDAMIO = """
// Andamiaje mínimo para evaluar el prototipo fuera del navegador.
// No reimplementa NADA de la lógica: sólo provee lo que el código toca al definirse.

// Reloj congelado: sin esto, todo lo que dependa de "hoy" (la antigüedad de los
// saldos, la serie de días) cambiaría cada día y la referencia sería inservible.
const __FIJO = new Date('%RELOJ%').getTime();
const __Date = Date;
globalThis.Date = class extends __Date {
  constructor(...a) { if (a.length === 0) { super(__FIJO); } else { super(...a); } }
  static now() { return __FIJO; }
};

class DCLogicStub {
  constructor(p) { this.props = p || {}; }
  setState(o) { this.state = Object.assign({}, this.state, typeof o === 'function' ? o(this.state) : o); }
  forceUpdate() {}
}
globalThis.DCLogic = DCLogicStub;
globalThis.React = { Component: DCLogicStub, createElement: () => null };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.window = globalThis;
globalThis.document = { addEventListener(){}, removeEventListener(){},
  querySelector: () => null, querySelectorAll: () => [],
  createElement: () => ({ style:{}, setAttribute(){}, appendChild(){} }),
  head: { appendChild(){} }, body: { appendChild(){} } };
globalThis.matchMedia = () => ({ matches:false, addEventListener(){}, addListener(){},
  removeEventListener(){}, removeListener(){} });
globalThis.navigator = { language: 'es-AR', onLine: true };
globalThis.fetch = () => Promise.reject(new Error('sin red en el arnés'));
"""

MOTOR = """
// ── Referencia dorada ───────────────────────────────────────────────────────
const CASOS = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
const inst = new Component({});

// Se pasa por migrar() a propósito: es lo que hace el prototipo al arrancar, así
// que comparar contra datos NO normalizados sería comparar contra otra cosa.
const d = migrar(JSON.parse(JSON.stringify(CASOS)));

const seguro = (fn) => { try { return fn(); } catch (e) { return { __error: String((e && e.message) || e), __stack: String((e && e.stack) || '').split('\\n').slice(0,3) }; } };

const ref = { _meta: { reloj: '%RELOJ%', origen: '%ORIGEN%' } };
%LLAMADAS%

// cuentas() necesita un TC; se usa el del último día de la serie para que sea
// determinista y no un número elegido a dedo.
ref.cuentas = seguro(() => {
  // serie() devuelve { rows, cap, ultimo }: el TC sale de la última fila.
  const filas = (ref.serie && ref.serie.rows) || [];
  const ult = filas.length ? filas[filas.length - 1] : null;
  const tc = (ult && ult.tc) || 1;
  return { _tcUsado: tc, saldos: inst.cuentas(d, tc) };
});

ref.datosNormalizados = d;
console.log(JSON.stringify(ref, null, 1));
"""


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("uso: generar_referencia.py /ruta/al/repo/del/prototipo")
    base = Path(sys.argv[1]).expanduser()
    proto = hallar_prototipo(base)
    print(f"  prototipo: {proto.name}")

    cuerpo = extraer_script(proto.read_text(encoding="utf-8"))
    print(f"  código extraído: {len(cuerpo.splitlines())} líneas")

    llamadas = "\n".join(f"ref.{c} = seguro(() => inst.{c}(d));" for c in CALCULOS)
    motor = (MOTOR.replace("%RELOJ%", RELOJ_FIJO)
                  .replace("%ORIGEN%", proto.name)
                  .replace("%LLAMADAS%", llamadas))
    andamio = ANDAMIO.replace("%RELOJ%", RELOJ_FIJO)

    with tempfile.TemporaryDirectory() as tmp:
        js = Path(tmp) / "correr.js"
        js.write_text(andamio + cuerpo + motor, encoding="utf-8")
        r = subprocess.run(["node", str(js), str(AQUI / "casos.json")],
                           capture_output=True, text=True)
    if r.returncode != 0:
        print("  ✗ Node falló:")
        print("\n".join("    " + l for l in r.stderr.splitlines()[:12]))
        sys.exit(1)

    ref = json.loads(r.stdout)
    (AQUI / "referencia.json").write_text(
        json.dumps(ref, ensure_ascii=False, indent=1), encoding="utf-8")

    # Un gate tiene que poder afirmar algo. Si todos los cálculos vinieron vacíos
    # o con error, la referencia no sirve y hay que decirlo, no guardarla igual.
    problemas = [k for k in CALCULOS + ["cuentas"]
                 if isinstance(ref.get(k), dict) and "__error" in ref[k]]
    print(f"  referencia.json: {len(json.dumps(ref)):,} bytes")
    for k in CALCULOS + ["cuentas"]:
        v = ref.get(k)
        if isinstance(v, dict) and "__error" in v:
            print(f"  🔴 {k}: {v['__error'][:140]}")
        elif isinstance(v, list):
            print(f"  ✅ {k}: lista de {len(v)}")
        elif isinstance(v, dict):
            print(f"  ✅ {k}: {len(v)} claves")
    if problemas:
        sys.exit(f"\n  🔴 {len(problemas)} cálculo(s) con error: la referencia NO sirve como gate")


if __name__ == "__main__":
    main()
