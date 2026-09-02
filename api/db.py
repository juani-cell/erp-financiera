"""Acceso a la base. psycopg directo, sin ORM: en cálculos de plata queremos ver
exactamente qué consulta corre, sin un traductor en el medio."""

import os

from psycopg_pool import ConnectionPool

_pool: ConnectionPool | None = None


def pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        url = os.environ.get("DATABASE_URL")
        if not url:
            # Falla fuerte y temprano. Un proceso vivo sin base es peor que un
            # deploy que se cae: el segundo avisa, el primero finge que anda.
            raise RuntimeError("falta la variable DATABASE_URL")
        _pool = ConnectionPool(conninfo=url, min_size=0, max_size=5, timeout=5, open=True)
    return _pool


def ping() -> None:
    """Verifica que la base responda.

    Levanta excepción en vez de devolver True/False a propósito: queremos el
    motivo en el log. Un booleano esconde la causa, y después no sabés si falló
    la red, la credencial o la base.
    """
    with pool().connection(timeout=5) as conn:
        conn.execute("select 1")
