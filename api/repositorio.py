"""Leer y guardar el estado completo contra la base.

Guardar es un **diff**, no un "borrar todo y reescribir". Tres motivos, y los
tres son de fondo:

1. Reescribir todo tocaría filas de días ya cerrados, y el disparador lo
   rechaza. Con razón: un día cerrado no se toca.
2. La auditoría registraría un borrado y un alta de TODO en cada guardado. Una
   auditoría llena de ruido no se lee, y una auditoría que no se lee no existe.
3. Los disparadores sólo tienen sentido si se disparan ante cambios de verdad.

El orden de aplicación no es negociable:
  · primero se REABREN días (borrar de `cierre_diario`), porque para modificar
    algo de un día cerrado hay que abrirlo antes;
  · después los borrados, de hijos a padres;
  · después altas y modificaciones, de padres a hijos;
  · y los CIERRES al final, cuando lo que se cierra ya está cargado.
"""
from __future__ import annotations

import json

from .estado import a_documento, a_filas

# tabla -> clave primaria. El orden es de PADRES a HIJOS.
TABLAS: list[tuple[str, str]] = [
    ("titular", "id"),
    ("direccion", "id"),
    ("operacion", "id"),
    ("cable", "id"),
    ("pata", "id"),
    ("movimiento_cc", "id"),
    ("gasto", "id"),
    ("aporte", "id"),
    ("cotizacion", "id"),
    ("config", "clave"),
]
CIERRES = ("cierre_diario", "fecha")

JSONB = {"config": {"valor"}, "cierre_diario": {"params"},
         "cotizacion": {"valores", "extra"},
         "titular": {"extra"}, "operacion": {"extra"}, "cable": {"extra"},
         "movimiento_cc": {"extra"}, "gasto": {"extra"}, "aporte": {"extra"}}


def _adaptar(tabla: str, fila: dict) -> dict:
    """Los campos jsonb viajan como texto JSON, no como dict de Python."""
    js = JSONB.get(tabla, set())
    return {k: (json.dumps(v, ensure_ascii=False) if k in js and v is not None else v)
            for k, v in fila.items()}


def leer_estado(conn) -> tuple[int, dict]:
    filas: dict[str, list[dict]] = {}
    for tabla, pk in TABLAS + [CIERRES]:
        # `order by` explícito: sin él Postgres devuelve en el orden que quiera,
        # y el orden de las listas del documento es dato. Ver 007 del esquema.
        orden = "orden" if tabla not in ("config", "cierre_diario") else pk
        with conn.cursor() as cur:
            cur.execute(f"select * from {tabla} order by {orden}")
            cols = [d.name for d in cur.description]
            filas[tabla] = [dict(zip(cols, f)) for f in cur.fetchall()]
    version = conn.execute("select version from estado_version").fetchone()[0]
    return version, a_documento(filas)


def _diff(viejas: list[dict], nuevas: list[dict], pk: str):
    # 🔴 Las claves se comparan como TEXTO, y esto no es cosmético.
    # La base devuelve la fecha de `cierre_diario` como `date` y el documento la
    # trae como cadena. Comparándolas crudas nunca coinciden, así que el diff
    # leía el cierre existente como una BAJA y el entrante como un ALTA: cada
    # guardado borraba el cierre y lo volvía a crear, y en el medio el día
    # quedaba abierto y se podía modificar cualquier cosa de un día cerrado.
    # O sea: una comparación de tipos distintos desactivaba la protección
    # entera. Lo encontró el test de punta a punta, no una revisión del código.
    ix_v = {str(f[pk]): f for f in viejas}
    ix_n = {str(f[pk]): f for f in nuevas}
    altas = [f for k, f in ix_n.items() if k not in ix_v]
    bajas = [k for k in ix_v if k not in ix_n]
    cambios = []
    for k, nueva in ix_n.items():
        vieja = ix_v.get(k)
        if vieja is None:
            continue
        # Sólo las columnas que el mapeo escribe: la base agrega otras (fechas
        # de creación, defaults) que no vienen en el documento y compararlas
        # marcaría como cambiada una fila que nadie tocó.
        distintos = {c: v for c, v in nueva.items()
                     if c in vieja and not _igual(vieja[c], v)}
        if distintos:
            cambios.append((k, distintos))
    return altas, cambios, bajas


# El dominio `monto` es numeric(20,6): la base redondea a 6 decimales al
# guardar. Comparar con más precisión que eso marca como CAMBIADA una fila que
# la base va a escribir exactamente igual.
DECIMALES = 6


def _igual(a, b) -> bool:
    """¿La base guardaría estos dos valores igual?

    Ésa es la pregunta correcta, y no "¿son idénticos en Python?". Dos errores
    que salieron de confundirlas, y los dos hacían que CADA guardado reescribiera
    todas las operaciones (y por lo tanto chocara con cualquier día cerrado):

    · un `jsonb` comparado como texto: mismo contenido, distinto orden de claves;
    · `15300000.000000` contra `15299999.999999998`, que es la misma plata en una
      columna de 6 decimales.
    """
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    if isinstance(a, bool) or isinstance(b, bool):
        return bool(a) is bool(b)
    if isinstance(a, (dict, list)) or isinstance(b, (dict, list)):
        norm = lambda v: json.dumps(  # noqa: E731
            json.loads(v) if isinstance(v, str) else v, sort_keys=True, default=str)
        try:
            return norm(a) == norm(b)
        except (TypeError, ValueError):
            return str(a) == str(b)
    try:
        return round(float(a), DECIMALES) == round(float(b), DECIMALES)
    except (TypeError, ValueError):
        pass
    return str(a) == str(b)


def guardar_estado(conn, doc: dict, version_esperada: int, quien: str) -> int:
    """Aplica el diff. Devuelve la versión nueva.

    Lanza `ConflictoDeVersion` si alguien guardó en el medio: sin eso, el
    segundo en guardar le borra el trabajo al primero y NADIE SE ENTERA, que es
    la peor forma de perder datos.
    """
    actual = conn.execute(
        "select version from estado_version for update").fetchone()[0]
    if actual != version_esperada:
        raise ConflictoDeVersion(actual, version_esperada)

    nuevas = a_filas(doc)
    viejas_version, viejo_doc = None, None
    viejas: dict[str, list[dict]] = {}
    for tabla, _ in TABLAS + [CIERRES]:
        with conn.cursor() as cur:
            cur.execute(f"select * from {tabla}")
            cols = [d.name for d in cur.description]
            viejas[tabla] = [dict(zip(cols, f)) for f in cur.fetchall()]

    tocadas = 0

    # 1 · Reabrir días. Va PRIMERO: para tocar algo de un día cerrado hay que
    #     abrirlo antes, y el disparador lo hace cumplir.
    tabla, pk = CIERRES
    c_altas, c_cambios, c_bajas = _diff(viejas[tabla], nuevas.get(tabla) or [], pk)
    for k in c_bajas:
        conn.execute(f"delete from {tabla} where {pk} = %s", (k,))
        tocadas += 1

    # 2 · Borrados, de hijos a padres.
    for tabla, pk in reversed(TABLAS):
        _, _, bajas = _diff(viejas[tabla], nuevas.get(tabla) or [], pk)
        for k in bajas:
            conn.execute(f"delete from {tabla} where {pk} = %s", (k,))
            tocadas += 1

    # 3 · Altas y modificaciones, de padres a hijos.
    for tabla, pk in TABLAS:
        altas, cambios, _ = _diff(viejas[tabla], nuevas.get(tabla) or [], pk)
        for fila in altas:
            f = _adaptar(tabla, fila)
            cols = list(f)
            conn.execute(
                f"insert into {tabla} ({', '.join(cols)}) "
                f"values ({', '.join(['%s'] * len(cols))})",
                [f[c] for c in cols])
            tocadas += 1
        for k, distintos in cambios:
            f = _adaptar(tabla, distintos)
            cols = list(f)
            conn.execute(
                f"update {tabla} set {', '.join(c + ' = %s' for c in cols)} "
                f"where {pk} = %s", [f[c] for c in cols] + [k])
            tocadas += 1

    # 4 · Cerrar días. Va ÚLTIMO, cuando lo que se cierra ya está cargado.
    tabla, pk = CIERRES
    for fila in c_altas:
        f = _adaptar(tabla, fila)
        cols = list(f)
        conn.execute(f"insert into {tabla} ({', '.join(cols)}) "
                     f"values ({', '.join(['%s'] * len(cols))})", [f[c] for c in cols])
        tocadas += 1
    for k, distintos in c_cambios:
        f = _adaptar(tabla, distintos)
        cols = list(f)
        conn.execute(f"update {tabla} set {', '.join(c + ' = %s' for c in cols)} "
                     f"where {pk} = %s", [f[c] for c in cols] + [k])
        tocadas += 1

    nueva_version = actual + 1
    conn.execute("update estado_version set version = %s, guardado = now(), quien = %s",
                 (nueva_version, quien))
    return nueva_version


class ConflictoDeVersion(Exception):
    def __init__(self, actual: int, enviada: int):
        self.actual, self.enviada = actual, enviada
        super().__init__(f"el estado cambió: la base está en {actual} y llegó {enviada}")


def asegurar_monedas(conn, doc: dict) -> list[str]:
    """Da de alta las monedas que el documento usa y la tabla no conoce.

    La tabla aprende de los datos en vez de rechazarlos. Es lo contrario de
    Alaska, que tenía las monedas clavadas como columnas del movimiento: agregar
    una por API no llegaba nunca a las operaciones.
    """
    f = a_filas(doc)
    usadas = {r["moneda"] for r in f["pata"]} | {r["moneda"] for r in f["gasto"]} \
        | {r["moneda"] for r in f["aporte"]} | {r["moneda"] for r in f["movimiento_cc"]} \
        | {r["moneda"] for r in f["operacion"]} | {r["moneda_pago"] for r in f["operacion"]}
    usadas = {m for m in usadas if m}
    conocidas = {r[0] for r in conn.execute("select codigo from moneda").fetchall()}
    nuevas = sorted(usadas - conocidas)
    for m in nuevas:
        conn.execute("insert into moneda (codigo, nombre) values (%s, %s)", (m, m))
    return nuevas
