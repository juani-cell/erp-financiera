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

## Los dos gates, y por qué hacen falta los dos

```bash
python3 pruebas/test_calculos.py      # ¿el port da los mismos números?
python3 pruebas/test_mutaciones.py    # ¿ese gate puede fallar?
```

El segundo es el que más rinde y el menos obvio. **Un gate en verde no dice nada
hasta que se lo rompe a propósito y se confirma que se pone rojo por el motivo que
dice cubrir.** `test_mutaciones.py` cambia una línea del cálculo, corre el gate, y
exige que salga en rojo. Si alguna mutación deja el gate en verde, es que **ningún
caso ejercita esa regla**: hay que agregar el caso, no bajar la mutación.

Existe porque esa disciplina, si vive sólo en la cabeza de alguien, no se ejecuta.

### Tres agujeros que encontró, todos reales

| Qué quedaba sin cubrir | Cómo se destapó |
|---|---|
| El default «una pata en cta. cte. arranca completada» | Se invirtió el default y el gate siguió en verde: **ningún caso tenía la clave ausente**, todos la tenían en `true` o `false` |
| La valuación del real y de la libra | Se cambió la división por multiplicación en el cross del real y el gate siguió en verde: **no había saldo en esas monedas** |
| Que el arnés distinga las dos reglas de imputación | Todos los cables tenían `fecha == fechaEjecucion`, así que el arnés era **ciego al cambio de regla que estábamos por hacer** |

### Una mutación que NO era una rotura

Cambiar `var_tc = 0 si es el primer día` por `reval_anterior - (prev or 0)` deja el
gate en verde, y está bien: en el primer día no hay posición anterior, así que
`reval_anterior` vale cero y las dos formas son **equivalentes**. No es un agujero.
Conviene saber distinguir una cosa de la otra antes de salir a agregar casos.
