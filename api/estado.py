"""Traducción entre el ESTADO del prototipo y nuestras tablas.

La UI que reusamos guarda todo en un solo documento y lo manda entero. Este
módulo lo parte en filas para guardarlo, y lo vuelve a armar para devolverlo.

La regla que ordena todo el archivo: **la ida y vuelta tiene que ser idéntica**.
Cualquier cosa que la base no sepa reproducir se pierde en el primer guardado,
sin error y sin aviso, y el usuario ve un campo vacío sin entender por qué. Por
eso el test compara documento contra documento, no tabla contra tabla.

Lo que este módulo NO traduce, a propósito:
  · `usuarios`  → las contraseñas no vuelven al navegador. Las arma el servidor.
  · `audit`     → tenemos auditoría propia, por disparadores de la base.
  · `operador`  → sale de la sesión, no del documento.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

# Los campos que el mapeo reproduce por su cuenta. TODO lo demás va a `extra`
# y vuelve tal cual: el documento que manda la UI trae campos que `migrar()`
# agrega (`_patasFijas`, `_alineado`, `lugar`) y perder uno solo genera un diff
# fantasma en cada carga. Si ese diff roza un día cerrado, bloquea el guardado
# entero. Ver la migración 008 del esquema.
REPRODUCIDAS = {
    "op": {"id", "numero", "tipo", "fecha", "clienteId", "comisionistaId",
           "cantidad", "tc", "comision", "comisionMoneda", "formaPago",
           "formaRetiro", "partesPago", "partesDivisa", "lugarPago",
           "lugarDivisa", "entregaPago", "entregaDivisa", "patasHechas",
           "patasFechas", "ok", "cancelado", "costo", "costoA",
           "moneda", "monedaPago"},
    "cable": {"id", "numero", "fecha", "fechaEjecucion", "tipo", "clienteId",
              "comisionistaId", "monto", "costoPct", "margenPct", "estado",
              "cancelado", "obs", "formaMayorista", "formaCliente",
              "partesMayorista", "partesCliente", "lugarMayorista",
              "lugarCliente", "entregaMayorista", "entregaCliente",
              "patasHechas", "patasFechas"},
    "titular": {"id", "numero", "nombre", "contacto", "alta", "obs",
                "direcciones", "tipo", "comisionPct"},
    "ctacte": {"id", "clienteId", "fecha", "moneda", "monto", "tipoMov",
               "motivo", "efectivo", "lugar", "entrega"},
    "gasto": {"id", "fecha", "motivo", "moneda", "monto", "montoOriginal",
              "socio", "obs"},
    "aporte": {"id", "socio", "fecha", "moneda", "monto", "concepto"},
    "cotiz": {"id", "fecha", "momento"},
}


def _extra(reg: dict, cual: str) -> dict | None:
    """Lo que el mapeo no reproduce, para devolverlo tal cual vino."""
    sobra = {k: v for k, v in reg.items() if k not in REPRODUCIDAS[cual]}
    # Una lista NULA no es lo mismo que una lista VACÍA a la hora de devolver el
    # documento igual, aunque el prototipo las trate igual al calcular.
    for k in ("partesPago", "partesDivisa", "partesMayorista", "partesCliente"):
        if k in REPRODUCIDAS[cual] and k in reg and reg[k] is None:
            sobra[k] = None
    return sobra or None


# Las colecciones del documento que viajan a tablas de verdad.
CLASES_OP = {"ops": "cambio", "cripto": "cripto", "mayoristaOps": "tesoreria"}
COLECCION_DE_CLASE = {v: k for k, v in CLASES_OP.items()}


def _moneda(reg: dict, campo: str, campo_otra: str, defecto: str):
    """El prototipo escribe `moneda: 'Otra'` + `monedaOtra: 'JPY'`.

    Eso es una forma de carga, no un hecho: el hecho es que fue en yenes.
    Devuelve (moneda_resuelta, texto_original_o_None).
    """
    v = reg.get(campo) or defecto
    if v == "Otra":
        otra = reg.get(campo_otra) or ""
        return (otra or defecto), otra
    return v, None


def _patas_de_operacion(o: dict, mon_pago: str, mon_div: str) -> list[dict]:
    """Una fila por pata. La clave (`pago-0`, `divisa`) es la misma que usa el
    prototipo, porque es la que aparece en `patasHechas` y `patasFechas`."""
    hechas = o.get("patasHechas") or {}
    fechas = o.get("patasFechas") or {}
    cant, tc = float(o.get("cantidad") or 0), float(o.get("tc") or 0)
    patas = []
    for partes_k, forma_k, lugar_k, entrega_k, base, total, moneda in (
        ("partesPago", "formaPago", "lugarPago", "entregaPago", "pago", cant * tc, mon_pago),
        ("partesDivisa", "formaRetiro", "lugarDivisa", "entregaDivisa", "divisa", cant, mon_div),
    ):
        partes = o.get(partes_k) or []
        if partes:
            for i, p in enumerate(partes):
                patas.append(dict(clave=f"{base}-{i}", monto=p.get("monto") or 0, moneda=moneda,
                                  forma=p.get("forma") or "efectivo",
                                  lugar=p.get("lugar"), entrega=p.get("entrega")))
        else:
            patas.append(dict(clave=base, monto=total, moneda=moneda,
                              forma=o.get(forma_k) or "efectivo",
                              lugar=o.get(lugar_k), entrega=o.get(entrega_k)))
    for p in patas:
        p["completada"] = bool(hechas.get(p["clave"]))
        p["completada_en"] = fechas.get(p["clave"])
        # Una pata de cuenta corriente NUNCA aparece en `patasHechas` (el
        # prototipo la excluye al armar las claves accionables). Guardamos esa
        # ausencia para poder reproducirla: sin esto, al rearmar el documento le
        # agregaríamos una clave que no estaba, y eso cambia el cálculo.
        p["en_patas_hechas"] = p["clave"] in hechas
    return patas


def _patas_de_cable(c: dict) -> list[dict]:
    hechas = c.get("patasHechas") or {}
    fechas = c.get("patasFechas") or {}
    monto = float(c.get("monto") or 0)
    patas = []
    for partes_k, forma_k, lugar_k, entrega_k, base in (
        ("partesMayorista", "formaMayorista", "lugarMayorista", "entregaMayorista", "mayorista"),
        ("partesCliente", "formaCliente", "lugarCliente", "entregaCliente", "cliente"),
    ):
        partes = c.get(partes_k) or []
        if partes:
            for i, p in enumerate(partes):
                patas.append(dict(clave=f"{base}-{i}", monto=p.get("monto") or 0, moneda="USD",
                                  forma=p.get("forma") or "efectivo",
                                  lugar=p.get("lugar"), entrega=p.get("entrega")))
        else:
            patas.append(dict(clave=base, monto=monto, moneda="USD",
                              forma=c.get(forma_k) or "efectivo",
                              lugar=c.get(lugar_k), entrega=c.get(entrega_k)))
    for p in patas:
        p["completada"] = bool(hechas.get(p["clave"]))
        p["completada_en"] = fechas.get(p["clave"])
        p["en_patas_hechas"] = p["clave"] in hechas
    return patas


def a_filas(doc: dict) -> dict[str, list[dict]]:
    """Documento → filas por tabla."""
    f: dict[str, list[dict]] = {k: [] for k in
        ("titular", "direccion", "operacion", "cable", "pata",
         "movimiento_cc", "gasto", "aporte", "cierre_diario", "cotizacion", "config")}

    for coleccion, clase in (("clientes", "cliente"), ("comisionistas", "comisionista")):
        for t in doc.get(coleccion) or []:
            f["titular"].append(dict(id=t["id"], clase=clase, numero=t.get("numero"),
                                     nombre=t.get("nombre"), contacto=t.get("contacto"),
                                     alta=t.get("alta"), obs=t.get("obs"), activo=True,
                                     comision_pct=t.get("comisionPct"),
                                     rol=t.get("tipo"),
                                     extra=_extra(t, "titular")))
            for i, dirx in enumerate(t.get("direcciones") or []):
                f["direccion"].append(dict(id=f"{t['id']}·dir{i}", titular_id=t["id"],
                                           alias=dirx.get("alias"), calle=dirx.get("calle"),
                                           piso=dirx.get("piso"), obs=dirx.get("obs")))

    for coleccion, clase in CLASES_OP.items():
        for o in doc.get(coleccion) or []:
            mon_div, otra_div = _moneda(o, "moneda", "monedaOtra", "USD")
            mon_pago, otra_pago = _moneda(o, "monedaPago", "monedaPagoOtra", "ARS")
            f["operacion"].append(dict(
                id=o["id"], numero=o.get("numero"), clase=clase, tipo=o.get("tipo"),
                fecha=o.get("fecha"), cliente_id=o.get("clienteId") or None,
                comisionista_id=o.get("comisionistaId") or None,
                moneda_pago=mon_pago, moneda=mon_div,
                moneda_pago_otra=otra_pago, moneda_otra=otra_div,
                cantidad=o.get("cantidad") or 0, tc=o.get("tc") or 0,
                comision=o.get("comision") or 0, comision_moneda=o.get("comisionMoneda"),
                costo=o.get("costo"), costo_a=o.get("costoA"),
                estado=o.get("ok") or "Pendiente", cancelado=bool(o.get("cancelado")),
                lugar_pago=o.get("lugarPago"), lugar_divisa=o.get("lugarDivisa"),
                entrega_pago=o.get("entregaPago"), entrega_divisa=o.get("entregaDivisa"),
                forma_pago=o.get("formaPago"), forma_retiro=o.get("formaRetiro"),
                extra=_extra(o, "op")))
            for p in _patas_de_operacion(o, mon_pago, mon_div):
                f["pata"].append(dict(id=f"{o['id']}·{p['clave']}", operacion_id=o["id"],
                                      cable_id=None, **p))

    for c in doc.get("cables") or []:
        f["cable"].append(dict(
            id=c["id"], numero=c.get("numero"), fecha=c.get("fecha"),
            fecha_ejecucion=c.get("fechaEjecucion") or None, tipo=c.get("tipo"),
            cliente_id=c.get("clienteId") or None, comisionista_id=c.get("comisionistaId") or None,
            monto=c.get("monto") or 0, costo_pct=c.get("costoPct") or 0,
            margen_pct=c.get("margenPct") or 0, estado=c.get("estado") or "pendiente",
            forma_mayorista=c.get("formaMayorista"), forma_cliente=c.get("formaCliente"),
            cancelado=bool(c.get("cancelado")), obs=c.get("obs"),
            lugar_mayorista=c.get("lugarMayorista"), lugar_cliente=c.get("lugarCliente"),
            entrega_mayorista=c.get("entregaMayorista"), entrega_cliente=c.get("entregaCliente"),
            extra=_extra(c, "cable")))
        for p in _patas_de_cable(c):
            f["pata"].append(dict(id=f"{c['id']}·{p['clave']}", operacion_id=None,
                                  cable_id=c["id"], **p))

    for m in doc.get("ctacte") or []:
        f["movimiento_cc"].append(dict(
            id=m["id"], titular_id=m.get("clienteId"), fecha=m.get("fecha"),
            moneda=m.get("moneda"), monto=m.get("monto") or 0, tipo_mov=m.get("tipoMov"),
            motivo=m.get("motivo"), efectivo=bool(m.get("efectivo")),
            lugar=m.get("lugar"), entrega=m.get("entrega"),
            extra=_extra(m, "ctacte")))

    for g in doc.get("gastos") or []:
        f["gasto"].append(dict(id=g["id"], fecha=g.get("fecha"), motivo=g.get("motivo"),
                               moneda=g.get("moneda"), monto=g.get("monto") or 0,
                               monto_original=g.get("montoOriginal"), socio=g.get("socio"),
                               obs=g.get("obs"), extra=_extra(g, "gasto")))

    for a in doc.get("aportes") or []:
        f["aporte"].append(dict(id=a["id"], socio=a.get("socio"), fecha=a.get("fecha"),
                                moneda=a.get("moneda"), monto=a.get("monto") or 0,
                                concepto=a.get("concepto"), extra=_extra(a, "aporte")))

    for fecha, cierre in (doc.get("cierres") or {}).items():
        f["cierre_diario"].append(dict(fecha=fecha, params=cierre))

    for i, c in enumerate(doc.get("cotiz") or []):
        valores = {k: v for k, v in c.items() if k not in ("fecha", "momento", "id")}
        f["cotizacion"].append(dict(id=c.get("id") or f"cotiz·{c.get('fecha')}·{c.get('momento')}",
                                    fecha=c.get("fecha"), momento=c.get("momento"), valores=valores,
                                    extra=None))

    if doc.get("params") is not None:
        f["config"].append(dict(clave="params", valor=doc["params"]))

    return f


# ════════════════════════════════════════════════════════════════════════════
# La vuelta: filas → documento
# ════════════════════════════════════════════════════════════════════════════

def _num(v):
    """Postgres devuelve `numeric` como Decimal o texto; el documento los quiere
    como números. Un int o un float que ya vienen bien NO se tocan: el prototipo
    tiene un `tc` de 1.0 y convertirlo a 1 cambiaría el documento.
    (En JavaScript 1 y 1.0 son el mismo número, así que esto es prolijidad de la
    ida y vuelta, no una diferencia que el usuario pueda ver.)"""
    if v is None or isinstance(v, (int, float)) and not isinstance(v, bool):
        return v
    f = float(v)
    return int(f) if f == int(f) else f


def _armar_patas(patas: list[dict], base_pago: str, base_div: str):
    """Rehace `partes*`, `forma*`, `lugar*`, `entrega*`, `patasHechas` y
    `patasFechas` a partir de las filas de patas."""
    por_base = {base_pago: [], base_div: []}
    sueltas = {}
    for p in sorted(patas, key=lambda x: x["clave"]):
        c = p["clave"]
        if "-" in c:
            por_base[c.rsplit("-", 1)[0]].append(p)
        else:
            sueltas[c] = p

    hechas, fechas = {}, {}
    for p in patas:
        if p.get("en_patas_hechas"):
            hechas[p["clave"]] = bool(p["completada"])
        if p.get("completada_en"):
            fechas[p["clave"]] = p["completada_en"]

    salida = {"patasHechas": hechas}
    if fechas:
        salida["patasFechas"] = fechas
    for base in (base_pago, base_div):
        partidas = sorted(por_base[base], key=lambda x: int(x["clave"].rsplit("-", 1)[1]))
        if partidas:
            salida[base] = [dict(monto=_num(p["monto"]), forma=p["forma"],
                                 lugar=p["lugar"] or "", entrega=p["entrega"] or "")
                            for p in partidas]
            salida[base + "·forma"] = None
        else:
            u = sueltas.get(base)
            salida[base] = []
            salida[base + "·forma"] = u["forma"] if u else "efectivo"
            salida[base + "·lugar"] = (u["lugar"] or "") if u else ""
            salida[base + "·entrega"] = (u["entrega"] or "") if u else ""
    return salida


def _json_puro(v):
    """Convierte lo que Postgres devuelve en tipos que el documento entiende.

    `psycopg` devuelve `date` donde el documento tiene "2026-08-11", y `Decimal`
    donde tiene un número. Con FastAPI en el medio no se nota, porque serializa
    igual; pero entonces el contrato de este módulo sería "documento entra,
    CASI el mismo documento sale", y eso se paga en el primer consumidor que no
    sea la API (una herramienta, el acceso por chat). Se normaliza acá, que es
    donde el contrato se promete.
    """
    if isinstance(v, dict):
        return {str(k): _json_puro(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_json_puro(x) for x in v]
    if isinstance(v, (date, datetime)):
        return v.isoformat()[:10] if isinstance(v, date) and not isinstance(v, datetime) \
            else v.isoformat()
    if isinstance(v, Decimal):
        f = float(v)
        return int(f) if f == int(f) else f
    return v


def a_documento(f: dict[str, list[dict]]) -> dict:
    """Filas → documento, con la forma exacta que espera la UI."""
    doc: dict = {}

    for clase, coleccion in (("cliente", "clientes"), ("comisionista", "comisionistas")):
        doc[coleccion] = []
    dirs_por_titular: dict[str, list] = {}
    for d in f.get("direccion") or []:
        dirs_por_titular.setdefault(d["titular_id"], []).append(
            dict(alias=d.get("alias") or "", calle=d.get("calle") or "",
                 piso=d.get("piso") or "", obs=d.get("obs") or "", geo=None))
    for t in f.get("titular") or []:
        coleccion = "clientes" if t["clase"] == "cliente" else "comisionistas"
        reg = dict(id=t["id"], numero=t.get("numero"), nombre=t.get("nombre"),
                   contacto=t.get("contacto") or "", obs=t.get("obs") or "",
                   direcciones=dirs_por_titular.get(t["id"], []))
        # El cliente no lleva `tipo` y el comisionista sí, con esa capitalización.
        # El cliente lleva `alta` y el comisionista no. Reproducimos las dos
        # formas tal cual, porque la UI las escribe así.
        # `tipo` se reproduce tal como vino: el documento crudo no se lo pone
        # al cliente y el ya normalizado sí. Suponerlo rompía `cuentas()`.
        if t.get("rol") is not None:
            reg["tipo"] = t["rol"]
        if t["clase"] == "comisionista":
            reg["comisionPct"] = _num(t.get("comision_pct"))
        if t.get("alta") is not None:
            reg["alta"] = t["alta"]
        reg.update(t.get("extra") or {})
        doc[coleccion].append(reg)

    patas_por_op: dict[str, list] = {}
    patas_por_cable: dict[str, list] = {}
    for p in f.get("pata") or []:
        if p.get("operacion_id"):
            patas_por_op.setdefault(p["operacion_id"], []).append(p)
        else:
            patas_por_cable.setdefault(p["cable_id"], []).append(p)

    for coleccion in CLASES_OP:
        doc[coleccion] = []
    for o in f.get("operacion") or []:
        pt = _armar_patas(patas_por_op.get(o["id"], []), "pago", "divisa")
        reg = dict(
            id=o["id"], numero=o.get("numero"), tipo=o.get("tipo"), fecha=o.get("fecha"),
            clienteId=o.get("cliente_id") or "",
            monedaPago=("Otra" if o.get("moneda_pago_otra") is not None else o["moneda_pago"]),
            monedaPagoOtra=o.get("moneda_pago_otra") or "",
            moneda=("Otra" if o.get("moneda_otra") is not None else o["moneda"]),
            monedaOtra=o.get("moneda_otra") or "",
            cantidad=_num(o.get("cantidad")), tc=_num(o.get("tc")),
            comisionistaId=o.get("comisionista_id") or "",
            comision=_num(o.get("comision")), comisionMoneda=o.get("comision_moneda"),
            formaPago=o.get("forma_pago"), formaRetiro=o.get("forma_retiro"),
            partesPago=pt["pago"], partesDivisa=pt["divisa"],
            lugarPago=o.get("lugar_pago") or "", lugarDivisa=o.get("lugar_divisa") or "",
            entregaPago=o.get("entrega_pago") or "", entregaDivisa=o.get("entrega_divisa") or "",
            patasHechas=pt["patasHechas"], ok=o.get("estado"), cancelado=bool(o.get("cancelado")))
        if "patasFechas" in pt:
            reg["patasFechas"] = pt["patasFechas"]
        if o["clase"] == "cripto":
            reg["costo"] = _num(o.get("costo"))
            reg["costoA"] = o.get("costo_a")
            for k in ("monedaPagoOtra", "monedaOtra"):
                reg.pop(k, None)          # la cripto no usa el escape de "Otra"
        if o["clase"] == "tesoreria":
            # Tesorería es contra el mayorista: no hay cliente ni comisión.
            for k in ("clienteId", "comision", "comisionMoneda"):
                reg.pop(k, None)
        reg.update(o.get("extra") or {})
        doc[COLECCION_DE_CLASE[o["clase"]]].append(reg)

    doc["cables"] = []
    for c in f.get("cable") or []:
        pt = _armar_patas(patas_por_cable.get(c["id"], []), "mayorista", "cliente")
        reg = dict(
            id=c["id"], numero=c.get("numero"), fecha=c.get("fecha"),
            fechaEjecucion=c.get("fecha_ejecucion"),
            clienteId=c.get("cliente_id") or "", comisionistaId=c.get("comisionista_id") or "",
            tipo=c.get("tipo"), monto=_num(c.get("monto")),
            costoPct=_num(c.get("costo_pct")), margenPct=_num(c.get("margen_pct")),
            formaMayorista=c.get("forma_mayorista"), formaCliente=c.get("forma_cliente"),
            partesMayorista=pt["mayorista"], partesCliente=pt["cliente"],
            lugarMayorista=c.get("lugar_mayorista") or "", lugarCliente=c.get("lugar_cliente") or "",
            entregaMayorista=c.get("entrega_mayorista") or "",
            entregaCliente=c.get("entrega_cliente") or "",
            patasHechas=pt["patasHechas"], estado=c.get("estado"),
            cancelado=bool(c.get("cancelado")), obs=c.get("obs") or "")
        if "patasFechas" in pt:
            reg["patasFechas"] = pt["patasFechas"]
        reg.update(c.get("extra") or {})
        doc["cables"].append(reg)

    doc["ctacte"] = [dict(id=m["id"], clienteId=m.get("titular_id"), fecha=m.get("fecha"),
                          moneda=m.get("moneda"), monto=_num(m.get("monto")),
                          tipoMov=m.get("tipo_mov"), motivo=m.get("motivo"),
                          efectivo=bool(m.get("efectivo")), lugar=m.get("lugar") or "",
                          entrega=m.get("entrega") or "", **(m.get("extra") or {}))
                     for m in f.get("movimiento_cc") or []]

    doc["gastos"] = [dict(id=g["id"], fecha=g.get("fecha"), motivo=g.get("motivo"),
                          moneda=g.get("moneda"), monto=_num(g.get("monto")),
                          montoOriginal=_num(g.get("monto_original")), socio=g.get("socio"),
                          obs=g.get("obs") or "", **(g.get("extra") or {}))
                     for g in f.get("gasto") or []]

    doc["aportes"] = [dict(id=a["id"], socio=a.get("socio"), fecha=a.get("fecha"),
                           moneda=a.get("moneda"), monto=_num(a.get("monto")),
                           concepto=a.get("concepto"), **(a.get("extra") or {}))
                      for a in f.get("aporte") or []]

    doc["cierres"] = {c["fecha"]: c["params"] for c in f.get("cierre_diario") or []}

    doc["cotiz"] = [dict(id=c["id"], fecha=c["fecha"], momento=c["momento"],
                         **(c.get("valores") or {}))
                    for c in f.get("cotizacion") or []]

    for c in f.get("config") or []:
        if c["clave"] == "params":
            doc["params"] = c["valor"]

    return _json_puro(doc)
