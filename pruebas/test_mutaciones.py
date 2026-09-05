#!/usr/bin/env python3
"""META-GATE: comprueba que el gate de cálculos PUEDE fallar.

Un gate en verde no dice nada hasta que se lo rompe a propósito y se confirma que
se pone rojo **por el motivo que dice cubrir**. En esta sesión eso me salvó tres
veces: dos agujeros de cobertura reales (el default de la pata en cuenta
corriente, y la valuación del real y la libra) que dejaban el gate ciego justo a
la regla que decía proteger.

Este archivo existe porque esa disciplina, si vive sólo en la cabeza de alguien,
no se ejecuta. Acá se ejecuta.

Cómo funciona: por cada mutación, cambia una línea de `api/calculos.py` en una
copia temporal, corre el gate, y exige que salga en ROJO. Si alguna mutación deja
el gate en verde, es que **ningún caso ejercita esa regla** y hay que agregar uno.

Uso:  python3 pruebas/test_mutaciones.py
"""

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

AQUI = Path(__file__).parent
RAIZ = AQUI.parent
OBJETIVO = RAIZ / "api" / "calculos.py"

# (descripción, texto original, texto mutado)
MUTACIONES = [
    ("traslado de costo del cable sólo si es positivo",
     "costo_trasladado = max(costo_pct, 0.0)",
     "costo_trasladado = costo_pct"),
    ("la pata PAGO en cta. cte. arranca completada",
     'pata_lista(o.get("patasHechas"), "pago", True)',
     'pata_lista(o.get("patasHechas"), "pago", False)'),
    ("la pata DIVISA en cta. cte. arranca completada",
     'pata_lista(o.get("patasHechas"), "divisa", True)',
     'pata_lista(o.get("patasHechas"), "divisa", False)'),
    ("los gastos se suman de nuevo en la operativa",
     "gan_operativa = pn_bruto - reval_anterior - aportes_hoy_usd + gastos_hoy",
     "gan_operativa = pn_bruto - reval_anterior - aportes_hoy_usd"),
    ("lo pendiente cuenta como patrimonio",
     '+ pend_hoy.get("ARS", 0.0) / tc + _valuar(pend_hoy, pf))',
     ')'),
    ("los aportes no son resultado operativo",
     "aportes_hoy_usd = aportes_hoy_pesos / tc + _valuar(aportes_hoy, pf)",
     "aportes_hoy_usd = 0.0"),
    ("el real se DIVIDE por su cross",
     'acc += v / (num(p.get("crossBrlC")) or 5.5)',
     'acc += v * (num(p.get("crossBrlC")) or 5.5)'),
    ("la libra se MULTIPLICA por su cross",
     'acc += v * (num(p.get("crossGbpC")) or 1)',
     'acc += v / (num(p.get("crossGbpC")) or 1)'),
    ("el euro se MULTIPLICA por su cross",
     'acc += v * (num(p.get("crossEurC")) or 1)',
     'acc += v / (num(p.get("crossEurC")) or 1)'),
    ("una moneda desconocida vale CERO al valuar",
     'if k in ("USD", "USDT", "USD cara chica"):',
     'if k in ("USD", "USDT", "USD cara chica", "JPY"):'),
    ("el costo de red del USDT sale de la caja sólo si lo paga la cueva",
     'and o.get("costoA") == "cueva" and num(o.get("costo"))):',
     'and num(o.get("costo"))):'),
    ("los cobros de efectivo mueven la caja AL REVÉS del saldo",
     'amt = -num(m.get("monto"))',
     'amt = num(m.get("monto"))'),
    # ── cuentas() ──
    ("las monedas que netean a cero no se muestran",
     "monedas = [k for k in por_mon if abs(por_mon[k]) > 0.005]",
     "monedas = list(por_mon)"),
    ("el saldo en ARS se DIVIDE por el TC al valuarlo",
     "return v / tc if tc else 0.0",
     "return v * tc if tc else 0.0"),
    ("la antigüedad toma la deuda MÁS VIEJA de todas las monedas",
     "if fx and (vieja is None or fx < vieja):",
     "if fx and (vieja is None or fx > vieja):"),
    ("el FIFO cancela contra el frente de la cola",
     "cola.pop(0)",
     "cola.pop()"),
    ("el FIFO sólo cancela entre signos opuestos",
     'while v and cola and (cola[0]["v"] > 0) != (v > 0):',
     'while v and cola and (cola[0]["v"] > 0) == (v > 0):'),
    ("un comisionista junta también los movs con su id como clienteId",
     'or m.get("clienteId") == c.get("id")]',
     ']'),
    ("una moneda desconocida vale su NOMINAL en cuenta corriente",
     "    if mon == \"LBR\":\n        return v * (num(p.get(\"crossGbpC\")) or 1)\n    return v",
     "    if mon == \"LBR\":\n        return v * (num(p.get(\"crossGbpC\")) or 1)\n    return 0.0"),
]


def corre_gate() -> bool:
    """True si el gate pasa (verde)."""
    r = subprocess.run([sys.executable, str(AQUI / "test_calculos.py")],
                       capture_output=True, text=True, cwd=str(RAIZ))
    return r.returncode == 0


def main() -> None:
    original = OBJETIVO.read_text(encoding="utf-8")

    print("=" * 72)
    print("META-GATE: ¿el gate de cálculos puede fallar?")
    print("=" * 72)

    if not corre_gate():
        sys.exit("\n🔴 el gate ya está en ROJO sin mutar nada. Arreglar eso primero.")
    print("\n  punto de partida: gate en VERDE ✅\n")

    ciegas = []
    with tempfile.TemporaryDirectory() as tmp:
        respaldo = Path(tmp) / "calculos.py"
        shutil.copy2(OBJETIVO, respaldo)
        try:
            for desc, viejo, nuevo in MUTACIONES:
                if viejo not in original:
                    ciegas.append((desc, "el texto a mutar YA NO EXISTE en el código"))
                    print(f"  ⚠️  {desc}\n      el texto a mutar ya no existe: la mutación quedó obsoleta")
                    continue
                OBJETIVO.write_text(original.replace(viejo, nuevo, 1), encoding="utf-8")
                if corre_gate():
                    ciegas.append((desc, "el gate quedó VERDE: ningún caso ejercita esta regla"))
                    print(f"  🔴 {desc}\n      el gate quedó VERDE: NINGÚN CASO ejercita esta regla")
                else:
                    print(f"  ✅ {desc}")
        finally:
            shutil.copy2(respaldo, OBJETIVO)

    print("\n" + "=" * 72)
    if ciegas:
        print(f"🔴 META-GATE EN ROJO: {len(ciegas)} regla(s) sin cobertura\n")
        for desc, motivo in ciegas:
            print(f"   · {desc}\n     {motivo}")
        print("\n   Qué hacer: agregar a casos.json un caso que ejercite esa regla,")
        print("   regenerar la referencia y volver a correr.")
        sys.exit(1)
    print(f"✅ META-GATE EN VERDE: las {len(MUTACIONES)} reglas están cubiertas")
    print("   (cada mutación pone el gate en rojo, así que el gate no es decorativo)")
    print("=" * 72)


if __name__ == "__main__":
    main()
