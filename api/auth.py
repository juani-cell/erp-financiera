"""Autenticación: lo único del prototipo que no se reusa.

El prototipo trae `admin`/`admin123` en texto plano adentro del archivo que se
baja el navegador. No es un descuido suyo: **todo lo que vive en el navegador lo
puede leer quien abra la página**. Por eso esto corre acá.

Sin dependencias externas: `scrypt` está en la biblioteca estándar. Una
dependencia menos es una cosa menos que auditar y que actualizar.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

# Parámetros de scrypt. Viajan adentro del hash para poder endurecerlos después
# sin invalidar lo ya guardado.
_N, _R, _P, _LARGO = 2 ** 14, 8, 1, 32

DURACION_SESION = timedelta(hours=12)      # una jornada de trabajo, no más
INTENTOS_ANTES_DE_BLOQUEAR = 5
BLOQUEO = timedelta(minutes=15)


def hashear_clave(clave: str) -> str:
    """Devuelve `scrypt$n$r$p$sal$derivada`, todo en hexadecimal."""
    sal = os.urandom(16)
    d = hashlib.scrypt(clave.encode(), salt=sal, n=_N, r=_R, p=_P, dklen=_LARGO)
    return f"scrypt${_N}${_R}${_P}${sal.hex()}${d.hex()}"


def verificar_clave(clave: str, guardado: str) -> bool:
    """Compara en tiempo constante.

    `hmac.compare_digest` en vez de `==` no es prolijidad: comparar cadenas con
    `==` corta en el primer byte distinto, y medir cuánto tardó filtra cuántos
    bytes acertaste. Con suficientes intentos, eso reconstruye la derivada.
    """
    try:
        algo, n, r, p, sal, esperado = guardado.split("$")
        if algo != "scrypt":
            return False
        d = hashlib.scrypt(clave.encode(), salt=bytes.fromhex(sal),
                           n=int(n), r=int(r), p=int(p), dklen=len(esperado) // 2)
        return hmac.compare_digest(d.hex(), esperado)
    except (ValueError, TypeError):
        return False


def nuevo_token() -> str:
    """32 bytes de aleatoriedad criptográfica. No hace falta más y no conviene
    menos: es lo único que separa a un desconocido de la caja de la financiera."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """De la sesión se guarda el HASH, no el token.

    Si alguien se lleva una copia de la tabla de sesiones, no puede usar ninguna.
    Acá alcanza SHA-256 y no hace falta scrypt: el token ya tiene 256 bits de
    entropía, así que no hay diccionario que probar. Lo que scrypt protege es una
    contraseña elegida por una persona, que es adivinable; esto no lo es.
    """
    return hashlib.sha256(token.encode()).hexdigest()


def ahora() -> datetime:
    return datetime.now(timezone.utc)


def vencimiento() -> datetime:
    return ahora() + DURACION_SESION
