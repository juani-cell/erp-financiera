# Arnés de regresión de los cálculos

## Qué es

El prototipo es una **especificación ejecutable**. Este arnés lo aprovecha: corre los
cálculos del prototipo contra un set de casos y guarda el resultado como
**referencia dorada**. Después, el port a Python se compara contra esa referencia
número por número.

## Por qué así, y no leyendo el código

Si escribo el port y el test leyendo el mismo código, **un malentendido mío pasa las
dos pruebas**. La referencia tiene que salir del artefacto **ejecutándose**, no de mi
lectura de él.

## Las tres piezas

| Archivo | Qué es |
|---|---|
| `casos.json` | El set de casos, **derivado del espacio de casos** de las reglas del README. Cada registro dice en `_casos.cobertura` qué regla ejercita |
| `generar_referencia.py` | Extrae el código del prototipo, lo evalúa en Node con un andamiaje mínimo y **reloj congelado**, y escribe la referencia |
| `referencia.json` | La referencia dorada. Se commitea: es el contrato |

## Cómo se corre

```bash
python3 pruebas/generar_referencia.py /ruta/al/repo/del/prototipo
```

## Dos propiedades que valen más de lo que parece

**Detecta cambios en el prototipo.** Cuando Agus lo modifica, regenerar la referencia
y mirar el diff de `referencia.json` **muestra exactamente qué cálculo cambió**. Es un
detector de deriva, no sólo un set de pruebas.

**Falla ruidosamente si un cálculo desaparece.** Los nombres de las funciones están en
`CALCULOS`. Si el prototipo renombra una, el generador corta con error en vez de
comparar contra nada. Ya pasó: el README manda portar `margenSugerido()`, que **no
existe** en el código.

## El reloj está congelado a propósito

En `2026-08-12T12:00:00Z`. Sin eso, todo lo que dependa de "hoy" (la antigüedad de los
saldos, el armado de la serie de días) cambiaría a diario y la referencia sería
inservible como contrato.

## Dos trampas encontradas al construirlo

**`migrar()` reescribe los datos.** El caso `op2` se cargó con el par invertido y el
prototipo lo normalizó a la orientación canónica, dando vuelta también las patas. Por
eso el generador pasa los casos por `migrar()`: comparar contra datos no normalizados
sería comparar contra otra cosa.

**Una pata en cuenta corriente arranca COMPLETADA por defecto.** El caso `cb3` no
probaba nada al principio porque tenía las dos patas en cuenta corriente. Para probar
que lo pendiente no impacta, las patas tienen que ser **efectivo**.
