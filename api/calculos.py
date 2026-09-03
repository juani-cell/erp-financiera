"""Port fiel de los cálculos del prototipo.

FIEL quiere decir: reproduce lo que el prototipo hace HOY, incluidas sus rarezas.
No corrige nada. El motivo es poder separar dos preguntas que si no se confunden:
«¿porté bien?» y «¿el cambio de regla está bien?». Primero se prueba la fidelidad
contra la referencia dorada; los cambios de regla vienen después, con su propio
antes y después.

Cada rareza preservada a propósito está marcada con «FIEL:».
"""

from __future__ import annotations

import math
from typing import Any

PUNTO_MEDIO = "·"  # el separador que el prototipo usa en los ids: 'op1·p'


# ── conversión de números ────────────────────────────────────────────────────

def num(v: Any) -> float:
    """Equivalente de `Number(v) || 0` de JavaScript.

    FIEL: en JS, `Number(null)` es 0, `Number("")` es 0 y `Number("abc")` es NaN,
    que con `|| 0` termina en 0. O sea que cualquier basura vale 0, sin avisar.
    """
    if v is None or v is False:
        return 0.0
    if v is True:
        return 1.0
    try:
        n = float(v)
    except (TypeError, ValueError):
        return 0.0
    return 0.0 if math.isnan(n) or math.isinf(n) else n


def parse_num(v: Any) -> float:
    """Port de `parseNum`: interpreta lo que escribió el usuario.

    FIEL, y acá está la causa del bug del separador: si no hay coma y hay UN punto
    con 0, 1 o 2 dígitos detrás, el punto se toma como DECIMAL. Con 3 dígitos
    detrás se toma como separador de miles. Es una heurística que adivina.

    ⚠️ En el backend esta función NO debería usarse para entrada de la API: la API
    recibe decimales canónicos y la interpretación del formato local vive en la
    pantalla. Está portada sólo para reproducir la referencia.
    """
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return float(v)
    s = "".join(ch for ch in str(v or "") if ch in "0123456789,.-−").replace("−", "-")
    if "," not in s:
        dots = s.count(".")
        after = len(s[s.index(".") + 1:]) if dots == 1 else -1
        if after in (0, 1, 2):
            s = s.replace(".", ",", 1)
    s = s.replace(".", "").replace(",", ".", 1)
    try:
        n = float(s)
    except ValueError:
        return 0.0
    return 0.0 if math.isnan(n) or math.isinf(n) else n


# ── patas ────────────────────────────────────────────────────────────────────

def pata_lista(patas_hechas: dict | None, key: str, es_cc_default: bool) -> bool:
    """¿Esa pata está marcada Completada?

    Sin marca explícita, una pata en cuenta corriente arranca completada (no hay
    nada físico que hacer) y una en efectivo arranca pendiente.

    La distinción entre «la clave no está» y «la clave está en false» es
    load-bearing: no se puede reemplazar por un `.get(key, default)` truthy.
    """
    hechas = patas_hechas or {}
    return bool(hechas[key]) if key in hechas else es_cc_default


def caja_completada_de(partes, forma_unica, key_base, patas_hechas, total) -> float:
    """Porción que YA movió caja: en efectivo/transferencia y marcada completada."""
    if isinstance(partes, list) and partes:
        acc = 0.0
        for i, p in enumerate(partes):
            if p.get("forma") == "cuenta corriente":
                continue
            if pata_lista(patas_hechas, f"{key_base}-{i}", False):
                acc += num(p.get("monto"))
        return acc
    if forma_unica == "cuenta corriente":
        return 0.0
    return total if pata_lista(patas_hechas, key_base, False) else 0.0


def claves_accionables(tipo: str, r: dict) -> list[str]:
    """Las patas que requieren una acción física (todo lo que no sea cta. cte.)."""
    keys: list[str] = []
    if tipo in ("ops", "cripto", "mayoristaOps"):
        pares = (("partesPago", "formaPago", "pago"), ("partesDivisa", "formaRetiro", "divisa"))
    else:
        pares = (("partesMayorista", "formaMayorista", "mayorista"),
                 ("partesCliente", "formaCliente", "cliente"))
    for campo_partes, campo_forma, base in pares:
        partes = r.get(campo_partes)
        if isinstance(partes, list) and partes:
            for i, p in enumerate(partes):
                if p.get("forma") != "cuenta corriente":
                    keys.append(f"{base}-{i}")
        elif r.get(campo_forma) != "cuenta corriente":
            keys.append(base)
    return keys


# ── cálculos ─────────────────────────────────────────────────────────────────

def capital(d: dict) -> dict:
    """Capital aportado por moneda.

    FIEL, y con una rareza que conviene conocer: cualquier moneda que no sea ARS,
    USD ni USDT cae en el balde 'eur'. Un aporte en reales sumaría a euros. Se
    preserva porque el port es fiel; queda anotado como cosa a corregir después.
    """
    cap = {"pesos": 0.0, "usd": 0.0, "usdt": 0.0, "eur": 0.0}
    for a in d.get("aportes") or []:
        m = a.get("moneda")
        k = "pesos" if m == "ARS" else "usd" if m == "USD" else "usdt" if m == "USDT" else "eur"
        cap[k] += num(a.get("monto"))
    return cap


def cable_calc(c: dict) -> dict:
    """Montos y margen de un cable.

    El costo del mayorista, cuando cobra (positivo), se traslada también al
    cliente además de nuestra comisión. Cuando el mayorista paga (negativo) queda
    como ganancia propia y NO se traslada.

    ⚠️ Ese último caso es el punto abierto con el cliente: la práctica de mercado
    es compartirlo mitad y mitad. Se porta como está hoy, a propósito.
    """
    m = parse_num(c.get("monto")) or 0.0
    costo_pct = parse_num(c.get("costoPct")) or 0.0
    comision_pct = parse_num(c.get("margenPct")) or 0.0
    costo_trasladado = max(costo_pct, 0.0)
    if c.get("tipo") == "Subida":
        monto_may = m * (1 + costo_pct / 100)
        monto_cli = m * (1 + comision_pct / 100 + costo_trasladado / 100)
        return {"montoMayorista": monto_may, "montoCliente": monto_cli,
                "ganancia": monto_cli - monto_may}
    monto_may = m * (1 - costo_pct / 100)
    monto_cli = m * (1 - comision_pct / 100 - costo_trasladado / 100)
    return {"montoMayorista": monto_may, "montoCliente": monto_cli,
            "ganancia": monto_may - monto_cli}


def _moneda_de(o: dict, campo: str, campo_otra: str, defecto: str) -> str:
    v = o.get(campo)
    if v == "Otra":
        return (o.get(campo_otra) or "Otra")
    return v or defecto


def movimientos_cc(d: dict) -> list[dict]:
    """Movimientos de cuenta corriente derivados de las operaciones.

    No se guardan: se derivan. El monto que entra en cuenta es siempre
    `cantidad × TC`, sin sumar el margen aparte, porque el TC ya es el precio
    negociado con el margen adentro.

    FIEL: la fecha del movimiento es la de la OPERACIÓN (`fecha`), también en los
    cables. La versión del 25/8 usaba `fechaEjecucion` en los cables y la del 1/9
    dejó de hacerlo. Ya está decidido cambiarlo a la fecha de completado de cada
    pata, pero eso va DESPUÉS de que este port esté verde.
    """
    out: list[dict] = []

    def patas_cc(o, coll, quien_campo, mon_pago, mon_div):
        """Emite los movimientos de las patas que quedaron en cuenta corriente."""
        quien = {quien_campo: o.get(quien_campo)}
        # pata de lo que vendemos: sale de la cuenta (negativo)
        partes = o.get("partesPago")
        if isinstance(partes, list) and partes:
            for i, p in enumerate(partes):
                if p.get("forma") == "cuenta corriente" and pata_lista(o.get("patasHechas"), f"pago-{i}", True):
                    out.append({"id": f"{o['id']}{PUNTO_MEDIO}p{i}", **quien, "fecha": o.get("fecha"),
                                "moneda": mon_pago, "monto": -num(p.get("monto")),
                                "opId": o.get("id"), "coll": coll, "auto": True, "efectivo": False})
        elif o.get("formaPago") == "cuenta corriente" and pata_lista(o.get("patasHechas"), "pago", True):
            out.append({"id": f"{o['id']}{PUNTO_MEDIO}p", **quien, "fecha": o.get("fecha"),
                        "moneda": mon_pago, "monto": -num(o.get("cantidad")) * num(o.get("tc")),
                        "opId": o.get("id"), "coll": coll, "auto": True, "efectivo": False})
        # pata de lo que compramos: entra a la cuenta (positivo)
        partes = o.get("partesDivisa")
        if isinstance(partes, list) and partes:
            for i, p in enumerate(partes):
                if p.get("forma") == "cuenta corriente" and pata_lista(o.get("patasHechas"), f"divisa-{i}", True):
                    out.append({"id": f"{o['id']}{PUNTO_MEDIO}d{i}", **quien, "fecha": o.get("fecha"),
                                "moneda": mon_div, "monto": num(p.get("monto")),
                                "opId": o.get("id"), "coll": coll, "auto": True, "efectivo": False})
        elif o.get("formaRetiro") == "cuenta corriente" and pata_lista(o.get("patasHechas"), "divisa", True):
            out.append({"id": f"{o['id']}{PUNTO_MEDIO}d", **quien, "fecha": o.get("fecha"),
                        "moneda": mon_div, "monto": num(o.get("cantidad")),
                        "opId": o.get("id"), "coll": coll, "auto": True, "efectivo": False})

    def comision_operador(o, coll):
        """Lo que la cueva le debe al operador. Es un costo hacia un tercero, no
        una ganancia: no tiene relación con el margen de la operación."""
        if not o.get("cancelado") and o.get("comisionistaId") and num(o.get("comision")):
            out.append({"id": f"{o['id']}{PUNTO_MEDIO}com", "comisionistaId": o.get("comisionistaId"),
                        "fecha": o.get("fecha"), "moneda": o.get("comisionMoneda") or "USD",
                        "monto": -num(o.get("comision")), "opId": o.get("id"), "coll": coll,
                        "auto": True, "efectivo": False})

    # FIEL: cambio y cripto NO se filtran por cancelado acá. Una operación
    # cancelada igual entra al bucle; lo que la deja sin efecto es que al
    # cancelarla se desmarcan todas sus patas.
    for o in d.get("ops") or []:
        patas_cc(o, "ops", "clienteId",
                 _moneda_de(o, "monedaPago", "monedaPagoOtra", "ARS"),
                 _moneda_de(o, "moneda", "monedaOtra", "USD"))
        comision_operador(o, "ops")

    for o in d.get("cripto") or []:
        patas_cc(o, "cripto", "clienteId", o.get("monedaPago") or "ARS", o.get("moneda") or "USDT")
        comision_operador(o, "cripto")

    # Tesorería: la contraparte es el mayorista, no un cliente, y no hay comisión.
    for o in [x for x in (d.get("mayoristaOps") or []) if not x.get("cancelado")]:
        patas_cc(o, "mayoristaOps", "comisionistaId",
                 _moneda_de(o, "monedaPago", "monedaPagoOtra", "ARS"),
                 _moneda_de(o, "moneda", "monedaOtra", "USD"))

    for c in [x for x in (d.get("cables") or []) if not x.get("cancelado")]:
        es_subida = c.get("tipo") == "Subida"
        calc = cable_calc(c)

        def suma_cc(partes, key_base, total, forma_unica):
            if isinstance(partes, list) and partes:
                acc = 0.0
                for i, p in enumerate(partes):
                    if p.get("forma") == "cuenta corriente" and pata_lista(c.get("patasHechas"), f"{key_base}-{i}", True):
                        acc += num(p.get("monto"))
                return acc
            return total if (forma_unica == "cuenta corriente"
                             and pata_lista(c.get("patasHechas"), key_base, True)) else 0.0

        may_cc = suma_cc(c.get("partesMayorista"), "mayorista", calc["montoMayorista"], c.get("formaMayorista"))
        cli_cc = suma_cc(c.get("partesCliente"), "cliente", calc["montoCliente"], c.get("formaCliente"))
        if may_cc:
            out.append({"id": f"{c['id']}{PUNTO_MEDIO}may", "comisionistaId": c.get("comisionistaId"),
                        "fecha": c.get("fecha"), "moneda": "USD",
                        "monto": -may_cc if es_subida else may_cc,
                        "opId": c.get("id"), "coll": "cables", "auto": True, "efectivo": False})
        if cli_cc:
            out.append({"id": f"{c['id']}{PUNTO_MEDIO}cli", "clienteId": c.get("clienteId"),
                        "fecha": c.get("fecha"), "moneda": "USD",
                        "monto": cli_cc if es_subida else -cli_cc,
                        "opId": c.get("id"), "coll": "cables", "auto": True, "efectivo": False})

    for m in d.get("ctacte") or []:
        out.append({"auto": False, **m})

    # Estable, igual que el sort de JS: a igual fecha se conserva el orden de emisión.
    return sorted(out, key=lambda m: m.get("fecha") or "")
