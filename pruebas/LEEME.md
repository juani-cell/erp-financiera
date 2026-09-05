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

---

## El piso de integridad: por qué un ✅ podía no significar nada

**Pasó de verdad el 3/9/2026.** Agus subió una versión nueva del prototipo que trae
esto adentro de `migrar()`, la función que corre en cada carga:

```js
// reseteo pedido: dejar el sistema en cero (operaciones, aportes, gastos)...
if (!d._datosEnCero) {
  d.ops = []; d.cripto = []; d.mayoristaOps = []; d.cables = [];
  d.gastos = []; d.aportes = []; d.ctacte = []; d.cotiz = []; d.cierres = {};
  d._datosEnCero = true;
}
if (!d._datosEnCeroV2) { d.clientes = []; d.comisionistas = []; ... }
if (!d._datosEnCeroV3) { ...; d.audit = []; ... }
```

En el prototipo es intencional y está bien: quería empezar de cero para probar.

Lo que no estaba bien era **este generador**: los 40 casos entraron, `migrar()` los
borró todos, los cuatro cálculos devolvieron vacío, y el generador imprimió
**`✅` en los cuatro** y guardó una referencia de 5 KB en lugar de 36 KB.
Un gate que dice verde sobre una corrida vacía no es un gate.

### Los tres controles que se agregaron

1. **¿Sobrevivieron los datos de entrada?** Se comparan los registros de
   `casos.json` contra los que quedaron en `datosNormalizados` después de
   `migrar()`. Si alguna colección se encoge, sale en rojo con el detalle.
2. **¿Cada cálculo devolvió algo?** Un cálculo vacío no sirve como contrato.
3. **La referencia se escribe DESPUÉS de validar.** Antes se escribía primero y
   se salía con error después, así que una referencia inválida quedaba en disco
   lista para commitear sin que nadie la mirara.

### Y se congeló el azar, además del reloj

`uid()` del prototipo es `'x' + Math.random().toString(36)`, así que los ids de
los registros que crea al migrar cambiaban en cada corrida y la referencia no era
reproducible byte a byte. Este arnés promete que **cuando cambia una regla, el
diff de la referencia se revisa a mano**: un diff con ruido enseña a ignorar diffs.
Ahora dos corridas seguidas dan el mismo archivo.

### Cómo se probó que el piso sirve

| Test | Contra qué | Resultado |
|---|---|---|
| Negativo | la versión de Agus que borra (`b43ff04`) | 🔴 rojo, nombra las 11 colecciones vaciadas, **y no pisa la referencia** |
| Positivo | la versión con la que se generó (`aad7603`) | ✅ verde, referencia idéntica |

Un control que no se demuestra que atrapa la cosa es sólo más código.

### Para medir qué cambió una versión nueva del prototipo

Si el prototipo trae una migración destructiva, hay que **fijar sus banderas** en
`casos.json` (`_datosEnCero: true`, etc.) para neutralizarla. Recién entonces el
diff de la referencia muestra el cambio de comportamiento real y no el borrado.


---

## La regla de imputación por pata, y por qué hubo que inventar casos nuevos

Cuando Agus implementó `patasFechas` (*una pata mueve caja el día en que se
completa*), se midió el impacto sobre los 40 casos y dio **cero diferencias**.
Eso parecía buena noticia y en parte lo era: **su regla es compatible hacia
atrás**. Pero significaba otra cosa, peor: **ningún caso ejercitaba la regla**,
porque todos caían en el fallback. Ni siquiera `cb4`, que existe justamente para
discriminar la imputación.

Un arnés que no distingue la regla vieja de la nueva no sirve para probar que
implementamos la nueva.

### Los 4 casos que se agregaron, y qué discrimina cada uno

| Caso | Qué ejercita |
|---|---|
| `op12` | El núcleo: cargada el día **cerrado**, una pata liquida ese día y la otra al siguiente. La caja se parte entre los dos días |
| `op13` | Una pata liquida un día **sin ninguna otra actividad**, así que la fila de la serie tiene que nacer de la fecha de liquidación. Y la otra pata no tiene fecha: el mismo caso cubre los dos caminos |
| `cr3` | La guarda del **costo de red**: la caja va al día de liquidación pero el costo se queda en el día de la operación |
| `cb5` | El camino de los **cables**, que es código aparte (`partesMayorista`/`partesCliente`) |

`cb4` se dejó **sin** `patasFechas` a propósito: hoy es la cobertura del
fallback, que es la que protege todo el histórico del cliente.

### Y 6 mutaciones nuevas, porque los casos no valen hasta que muerden

Cada una tiene que poner el gate en rojo: sacar el filtro por fecha, sacar el
fallback, sacar la guarda del costo de red, hacer que las fechas de liquidación
no generen fila, volver a mirar sólo las operaciones del día, y romper la
imputación por fecha en el camino de los cables. **Las 6 muerden.**
