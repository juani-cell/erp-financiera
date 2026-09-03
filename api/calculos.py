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


# ── precios y cotizaciones ───────────────────────────────────────────────────

ENTREGADO = "Completado"


def ultima_cotiz(d: dict, fecha: str | None = None) -> dict:
    """La última cotización cargada, opcionalmente hasta una fecha.

    FIEL: ordena por `fecha + momento` como texto. Funciona porque 'apertura' <
    'cierre' alfabéticamente, así que el cierre del mismo día queda después. Es
    frágil pero es lo que hace el prototipo.
    """
    cotiz = d.get("cotiz") or []
    base = [q for q in cotiz if (q.get("fecha") or "") <= fecha] if fecha else list(cotiz)
    base.sort(key=lambda q: (q.get("fecha") or "") + (q.get("momento") or ""))
    if base:
        return base[-1]
    p = d.get("params") or {}
    return {"dc": p.get("baseCompra"), "dv": p.get("baseVenta")}


def mercado_usd(d: dict, tipo: str, fecha: str | None = None) -> float:
    q = ultima_cotiz(d, fecha)
    p = d.get("params") or {}
    if tipo == "venta":
        return num(q.get("dv")) or num(p.get("baseVenta"))
    return num(q.get("dc")) or num(p.get("baseCompra"))


def a_usd(d: dict, monto: float, tipo: str | None = None) -> float:
    u = mercado_usd(d, tipo or "compra")
    return monto / u if u else 0.0


def tc_de_fecha(d: dict, fecha: str, prev: float = 0.0) -> float:
    """El TC con el que se valúa un día: el de cierre, si no el último del día,
    si no el último anterior conocido, si no el que traía, si no el de respaldo."""
    cotiz = d.get("cotiz") or []
    del_dia = [q for q in cotiz if q.get("fecha") == fecha and num(q.get("dv"))]
    cierre = next((q for q in del_dia if q.get("momento") == "cierre"), None)
    if cierre is None and del_dia:
        cierre = del_dia[-1]
    if cierre:
        return num(cierre.get("dv"))
    anteriores = [q for q in cotiz if (q.get("fecha") or "") <= fecha and num(q.get("dv"))]
    anteriores.sort(key=lambda q: (q.get("fecha") or "") + (q.get("momento") or ""))
    if anteriores:
        return num(anteriores[-1].get("dv"))
    if prev:
        return prev
    return num((d.get("params") or {}).get("baseVenta"))


# ── pendiente de cobrar/pagar ────────────────────────────────────────────────

def pendiente_por_moneda(d: dict, hasta_fecha: str | None = None) -> dict:
    """Lo que falta entregar o recibir, por moneda.

    Cuenta como patrimonio: una pata ya entregada cuya contraparte todavía no
    llegó no puede hacer «desaparecer» patrimonio. El crédito pendiente es tan
    patrimonio como la caja.

    Signo: la pata que debemos entregar va negativa; la que nos deben, positiva.
    """
    out: dict[str, float] = {}

    def add(mon, v):
        if v:
            out[mon] = out.get(mon, 0.0) + v

    for coll in ("ops", "cripto", "mayoristaOps"):
        for o in d.get(coll) or []:
            if o.get("cancelado"):
                continue
            if hasta_fecha and (o.get("fecha") or "") > hasta_fecha:
                continue
            mon_pago = _moneda_de(o, "monedaPago", "monedaPagoOtra", "ARS")
            defecto_div = "USDT" if coll == "cripto" else "USD"
            mon_div = _moneda_de(o, "moneda", "monedaOtra", defecto_div)
            total = num(o.get("cantidad")) * num(o.get("tc"))
            q = num(o.get("cantidad"))

            partes = o.get("partesPago")
            if isinstance(partes, list) and partes:
                for i, p in enumerate(partes):
                    if p.get("forma") == "cuenta corriente":
                        continue
                    if not pata_lista(o.get("patasHechas"), f"pago-{i}", False):
                        add(mon_pago, -num(p.get("monto")))
            elif (o.get("formaPago") and o.get("formaPago") != "cuenta corriente"
                  and not pata_lista(o.get("patasHechas"), "pago", False)):
                add(mon_pago, -total)

            partes = o.get("partesDivisa")
            if isinstance(partes, list) and partes:
                for i, p in enumerate(partes):
                    if p.get("forma") == "cuenta corriente":
                        continue
                    if not pata_lista(o.get("patasHechas"), f"divisa-{i}", False):
                        add(mon_div, num(p.get("monto")))
            elif (o.get("formaRetiro") and o.get("formaRetiro") != "cuenta corriente"
                  and not pata_lista(o.get("patasHechas"), "divisa", False)):
                add(mon_div, q)

    for c in d.get("cables") or []:
        if c.get("cancelado"):
            continue
        if hasta_fecha and (c.get("fecha") or "") > hasta_fecha:
            continue
        calc = cable_calc(c)
        es_subida = c.get("tipo") == "Subida"
        # Mismo signo que el efecto en caja al completarse.
        signo_may = -1 if es_subida else 1
        signo_cli = 1 if es_subida else -1
        for campo_partes, campo_forma, base, signo, total in (
            ("partesMayorista", "formaMayorista", "mayorista", signo_may, calc["montoMayorista"]),
            ("partesCliente", "formaCliente", "cliente", signo_cli, calc["montoCliente"]),
        ):
            partes = c.get(campo_partes)
            if isinstance(partes, list) and partes:
                for i, p in enumerate(partes):
                    if p.get("forma") != "cuenta corriente" and not pata_lista(c.get("patasHechas"), f"{base}-{i}", False):
                        add("USD", signo * num(p.get("monto")))
            elif (c.get(campo_forma) and c.get(campo_forma) != "cuenta corriente"
                  and not pata_lista(c.get("patasHechas"), base, False)):
                add("USD", signo * total)
    return out


# ── la serie diaria ──────────────────────────────────────────────────────────

def _valuar(sal: dict, p: dict) -> float:
    """Valúa un conjunto de saldos en USD. FIEL: las monedas que no reconoce (por
    ejemplo una 'Otra' como JPY) valen CERO, no se convierten ni se avisa."""
    acc = 0.0
    for k, v0 in sal.items():
        v = v0 or 0
        if k in ("USD", "USDT", "USD cara chica"):
            acc += v
        elif k == "EUR":
            acc += v * (num(p.get("crossEurC")) or 1)
        elif k == "BRL":
            acc += v / (num(p.get("crossBrlC")) or 5.5)
        elif k == "LBR":
            acc += v * (num(p.get("crossGbpC")) or 1)
    return acc


def serie(d: dict) -> dict:
    """La serie diaria: caja, resultado y patrimonio, día por día.

    El resultado del día NO es una suma de márgenes: separa cuánto se ganó
    operando de cuánto varió la posición por el tipo de cambio, revaluando toda
    la posición a dos TC distintos.
    """
    cap = capital(d)
    all_cc = movimientos_cc(d)

    gastos_por_fecha: dict[str, list] = {}
    for g in d.get("gastos") or []:
        gastos_por_fecha.setdefault(g.get("fecha"), []).append(g)

    # Aportes por su fecha real: entran a la caja el día que ocurren y desde ahí
    # quedan sujetos a variación de TC, pero no cuentan como resultado operativo.
    aportes_por_fecha: dict[str, dict] = {}
    for a in d.get("aportes") or []:
        mon = a.get("moneda") or "ARS"
        b = aportes_por_fecha.setdefault(a.get("fecha"), {})
        b[mon] = b.get(mon, 0.0) + num(a.get("monto"))

    fuentes = ([o.get("fecha") for o in d.get("ops") or []]
               + [m.get("fecha") for m in d.get("ctacte") or []]
               + [o.get("fecha") for o in d.get("cripto") or []]
               + [o.get("fecha") for o in d.get("mayoristaOps") or []]
               + [c.get("fecha") for c in d.get("cables") or []]
               + [c.get("fechaEjecucion") for c in d.get("cables") or [] if c.get("fechaEjecucion")]
               + list((d.get("cierres") or {}).keys())
               + list(gastos_por_fecha.keys())
               + [a.get("fecha") for a in d.get("aportes") or []])
    fechas = sorted({f for f in fuentes if f})

    def caja_de(o, total_pago, total_div):
        """Sólo la porción en efectivo/transferencia ya marcada Completada mueve
        caja. Cuenta corriente nunca mueve caja acá, y pendiente tampoco."""
        return (caja_completada_de(o.get("partesPago"), o.get("formaPago"), "pago", o.get("patasHechas"), total_pago),
                caja_completada_de(o.get("partesDivisa"), o.get("formaRetiro"), "divisa", o.get("patasHechas"), total_div))

    def div_diff(before: dict, after: dict) -> dict:
        out = {}
        for k in after:
            dv = (after.get(k) or 0) - (before.get(k) or 0)
            if abs(dv) > 0.005:
                out[k] = dv
        return out

    s_div: dict[str, float] = {}
    s_pesos = 0.0
    prev_tc = 0.0
    prev_fecha = None
    mes_total = mes_operativa = mes_var_tc = mes_gastos = 0.0
    mes_key = ""
    prev_pn_bruto = None
    prev_pat_valuado = None
    pat_real = None
    rows = []

    for f in fechas:
        ops = [o for o in (d.get("ops") or []) if o.get("fecha") == f and not o.get("cancelado")]
        cripto_dia = [o for o in (d.get("cripto") or []) if o.get("fecha") == f and not o.get("cancelado")]
        cables_dia = [c for c in (d.get("cables") or []) if c.get("fecha") == f and not c.get("cancelado")]
        mayorista_dia = [o for o in (d.get("mayoristaOps") or []) if o.get("fecha") == f and not o.get("cancelado")]

        def volumen_usd(q, tc, mon_a, mon_b, tipo):
            """Si alguna pata ya es USD, ese es el monto real operado: no se
            reconvierte por el TC de mercado, que puede diferir del pactado."""
            es_usd = lambda m: m in ("USD", "USDT", "USD cara chica")  # noqa: E731
            if es_usd(mon_b):
                return q
            if es_usd(mon_a):
                return q * tc
            return a_usd(d, q * tc, tipo)

        conf = (d.get("cierres") or {}).get(f) or {}
        mov_pesos = 0.0
        mov_div: dict[str, float] = {}

        def aplicar(lista, con_costo_cripto=False, tipo_vol=None):
            nonlocal mov_pesos
            vol = 0.0
            for o in lista:
                q, tc = num(o.get("cantidad")), num(o.get("tc"))
                if con_costo_cripto:
                    mon = o.get("moneda") or "USDT"
                    mon_a = o.get("monedaPago") or "ARS"
                else:
                    mon = _moneda_de(o, "moneda", "monedaOtra", "USD")
                    mon_a = _moneda_de(o, "monedaPago", "monedaPagoOtra", "ARS")
                pesos_caja, divisa_caja = caja_de(o, q * tc, q)
                if mon == "ARS":
                    mov_pesos += divisa_caja
                else:
                    mov_div[mon] = mov_div.get(mon, 0.0) + divisa_caja
                if mon_a == "ARS":
                    mov_pesos += -pesos_caja
                else:
                    mov_div[mon_a] = mov_div.get(mon_a, 0.0) - pesos_caja
                if con_costo_cripto and o.get("costoA") == "cueva" and num(o.get("costo")):
                    mov_div["USDT"] = mov_div.get("USDT", 0.0) - num(o.get("costo"))
                if o.get("ok") == ENTREGADO:
                    vol += volumen_usd(q, tc, mon_a, mon, tipo_vol or o.get("tipo"))
            return vol

        p0, u0, snap0 = mov_pesos, mov_div.get("USD", 0.0), dict(mov_div)
        vol_cambio = aplicar(ops)
        mov_pesos_cambio = mov_pesos - p0
        mov_usd_cambio = mov_div.get("USD", 0.0) - u0
        div_delta_cambio = div_diff(snap0, mov_div)
        if abs(mov_pesos_cambio) > 0.005:
            div_delta_cambio["ARS"] = mov_pesos_cambio

        p1, u1, snap1 = mov_pesos, mov_div.get("USD", 0.0), dict(mov_div)
        vol_cripto = aplicar(cripto_dia, con_costo_cripto=True)
        mov_pesos_cripto = mov_pesos - p1
        mov_usd_cripto = mov_div.get("USD", 0.0) - u1
        div_delta_cripto = div_diff(snap1, mov_div)
        if abs(mov_pesos_cripto) > 0.005:
            div_delta_cripto["ARS"] = mov_pesos_cripto

        p1b, u1b, snap1b = mov_pesos, mov_div.get("USD", 0.0), dict(mov_div)
        vol_mayorista = aplicar(mayorista_dia, tipo_vol="compra")
        mov_pesos_mayorista = mov_pesos - p1b
        mov_usd_mayorista = mov_div.get("USD", 0.0) - u1b
        div_delta_mayorista = div_diff(snap1b, mov_div)
        if abs(mov_pesos_mayorista) > 0.005:
            div_delta_mayorista["ARS"] = mov_pesos_mayorista

        u2, snap2 = mov_div.get("USD", 0.0), dict(mov_div)
        vol_cable = 0.0
        for c in cables_dia:
            es_subida = c.get("tipo") == "Subida"
            calc = cable_calc(c)
            caja_may = caja_completada_de(c.get("partesMayorista"), c.get("formaMayorista"),
                                          "mayorista", c.get("patasHechas"), calc["montoMayorista"])
            caja_cli = caja_completada_de(c.get("partesCliente"), c.get("formaCliente"),
                                          "cliente", c.get("patasHechas"), calc["montoCliente"])
            mov_div["USD"] = mov_div.get("USD", 0.0) + ((caja_cli - caja_may) if es_subida else (caja_may - caja_cli))
            if c.get("estado") == "ejecutado":
                vol_cable += num(c.get("monto"))
        mov_usd_cable = mov_div.get("USD", 0.0) - u2
        div_delta_cable = div_diff(snap2, mov_div)

        # Cobros y entregas de efectivo: mueven la caja AL REVÉS del saldo.
        p3, u3 = mov_pesos, mov_div.get("USD", 0.0)
        ctacte_dia = [m for m in (d.get("ctacte") or []) if m.get("fecha") == f and m.get("efectivo")]
        for m in ctacte_dia:
            amt = -num(m.get("monto"))
            if m.get("moneda") == "ARS":
                mov_pesos += amt
            else:
                mov_div[m.get("moneda")] = mov_div.get(m.get("moneda"), 0.0) + amt
        mov_pesos_ctacte = mov_pesos - p3
        mov_usd_ctacte = mov_div.get("USD", 0.0) - u3

        def monto_orig(g):
            """FIEL: si la clave existe pero vale null, JS usa null y termina en 0."""
            mon_g = "USD" if g.get("moneda") == "USD" else "ARS"
            if mon_g == "USD":
                return num(g["montoOriginal"] if "montoOriginal" in g else g.get("monto"))
            return num(g.get("monto"))

        p4, u4 = mov_pesos, mov_div.get("USD", 0.0)
        gastos_dia = gastos_por_fecha.get(f) or []
        for g in gastos_dia:
            mon_g = "USD" if g.get("moneda") == "USD" else "ARS"
            v = monto_orig(g)
            if mon_g == "ARS":
                mov_pesos -= v
            else:
                mov_div[mon_g] = mov_div.get(mon_g, 0.0) - v
        mov_pesos_gastos = mov_pesos - p4
        mov_usd_gastos = mov_div.get("USD", 0.0) - u4

        neto_pesos = mov_pesos
        neto_usd = mov_div.get("USD", 0.0)
        mov_div_dia = dict(mov_div)
        aportes_hoy = aportes_por_fecha.get(f) or {}
        aportes_hoy_pesos = aportes_hoy.get("ARS", 0.0)
        for k, v in aportes_hoy.items():
            if k != "ARS" and v:
                mov_div_dia[k] = mov_div_dia.get(k, 0.0) + v
        mov_pesos_total_dia = neto_pesos + aportes_hoy_pesos

        stock_antes_pesos, stock_antes_div = s_pesos, dict(s_div)
        s_pesos += neto_pesos + aportes_hoy_pesos
        for k, v in mov_div.items():
            s_div[k] = s_div.get(k, 0.0) + v
        for k, v in aportes_hoy.items():
            if k != "ARS" and v:
                s_div[k] = s_div.get(k, 0.0) + v

        tc = tc_de_fecha(d, f, prev_tc)
        prev_tc = tc

        cc_pesos, cc_div = 0.0, {}
        for m in [x for x in all_cc if (x.get("fecha") or "") <= f]:
            v = num(m.get("monto"))
            if m.get("moneda") == "ARS":
                cc_pesos += v
            else:
                cc_div[m.get("moneda")] = cc_div.get(m.get("moneda"), 0.0) + v
        cc_pesos_antes, cc_div_antes = 0.0, {}
        for m in [x for x in all_cc if (x.get("fecha") or "") < f]:
            v = num(m.get("monto"))
            if m.get("moneda") == "ARS":
                cc_pesos_antes += v
            else:
                cc_div_antes[m.get("moneda")] = cc_div_antes.get(m.get("moneda"), 0.0) + v

        pf = conf["params"] if (conf.get("cerrado") and conf.get("params")) else (d.get("params") or {})

        gastos_hoy = 0.0
        for g in gastos_dia:
            mon_g = "USD" if g.get("moneda") == "USD" else "ARS"
            v = monto_orig(g)
            gastos_hoy += (v / tc) if mon_g == "ARS" else v

        pend_hoy = pendiente_por_moneda(d, f)
        pend_ayer = pendiente_por_moneda(d, prev_fecha) if prev_fecha else {}
        pn_bruto = (s_pesos / tc + _valuar(s_div, pf) + cc_pesos / tc + _valuar(cc_div, pf)
                    + pend_hoy.get("ARS", 0.0) / tc + _valuar(pend_hoy, pf))
        reval_anterior = (stock_antes_pesos / tc + _valuar(stock_antes_div, pf)
                          + cc_pesos_antes / tc + _valuar(cc_div_antes, pf)
                          + pend_ayer.get("ARS", 0.0) / tc + _valuar(pend_ayer, pf))
        prev_fecha = f

        aportes_hoy_usd = aportes_hoy_pesos / tc + _valuar(aportes_hoy, pf)
        # Los gastos ya redujeron el stock arriba; se suman de nuevo para que
        # «operativa» sea el margen de trading puro y los gastos tengan su línea.
        gan_operativa = pn_bruto - reval_anterior - aportes_hoy_usd + gastos_hoy
        var_tc = 0.0 if prev_pn_bruto is None else reval_anterior - prev_pn_bruto
        prev_pn_bruto = pn_bruto
        resultado_total = gan_operativa + var_tc - gastos_hoy
        pat_valuado = pn_bruto
        pat_valuado_var = pat_valuado if prev_pat_valuado is None else pat_valuado - prev_pat_valuado
        prev_pat_valuado = pat_valuado
        pat_real = (reval_anterior if pat_real is None else pat_real) + gan_operativa - gastos_hoy

        mk = f[:7]
        if mk != mes_key:
            mes_key, mes_total, mes_operativa, mes_var_tc, mes_gastos = mk, 0.0, 0.0, 0.0, 0.0
        mes_total += resultado_total
        mes_operativa += gan_operativa
        mes_var_tc += var_tc
        mes_gastos += gastos_hoy

        rows.append({
            "fecha": f, "movPesos": neto_pesos, "movUsd": neto_usd,
            "movPesosTotalDia": mov_pesos_total_dia, "movDivDia": mov_div_dia, "tc": tc,
            "congelado": bool(conf.get("cerrado") and conf.get("params")),
            "sPesos": s_pesos, "sUsd": s_div.get("USD", 0.0), "saldos": dict(s_div),
            "cerrado": bool(conf.get("cerrado")),
            "ayerPesos": stock_antes_pesos, "ayerSaldos": stock_antes_div,
            "ganOperativa": gan_operativa, "varTC": var_tc, "gastosHoy": gastos_hoy,
            "resultadoTotal": resultado_total, "mesTotal": mes_total,
            "mesOperativa": mes_operativa, "mesVarTC": mes_var_tc, "mesGastos": mes_gastos,
            "patValuado": pat_valuado, "patValuadoVar": pat_valuado_var, "patReal": pat_real,
            "ccUsd": cc_pesos / tc + _valuar(cc_div, pf), "ccPesos": cc_pesos, "ccDiv": dict(cc_div),
            "desglose": [
                {"tipo": "cambio", "label": "Cambio de divisas", "movPesos": mov_pesos_cambio,
                 "movUsd": mov_usd_cambio, "cant": len(ops), "volUsd": vol_cambio, "divs": div_delta_cambio},
                {"tipo": "cripto", "label": "Cripto (USDT)", "movPesos": mov_pesos_cripto,
                 "movUsd": mov_usd_cripto, "cant": len(cripto_dia), "volUsd": vol_cripto, "divs": div_delta_cripto},
                {"tipo": "mayorista", "label": "Tesorería", "movPesos": mov_pesos_mayorista,
                 "movUsd": mov_usd_mayorista, "cant": len(mayorista_dia), "volUsd": vol_mayorista, "divs": div_delta_mayorista},
                {"tipo": "cable", "label": "Cables", "movPesos": 0, "movUsd": mov_usd_cable,
                 "cant": len(cables_dia), "volUsd": vol_cable, "divs": div_delta_cable},
                {"tipo": "ctacte", "label": "Movimientos de caja (cta. cte.)", "movPesos": mov_pesos_ctacte,
                 "movUsd": mov_usd_ctacte, "cant": len(ctacte_dia), "volUsd": 0, "divs": {}},
            ],
        })

    return {"rows": rows, "cap": cap, "ultimo": rows[-1] if rows else None}
