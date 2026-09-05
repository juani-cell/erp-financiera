# La UI

`app.html` es el archivo de Agus, **copiado sin modificar** desde
`agrosso92/ERP-Puentum` (`ERP Financiera (standalone).html`).

**No se edita.** El adaptador se inyecta al servirlo, en `api/main.py`. Así, para
tomar una mejora suya alcanza con reemplazar el archivo: no hay parches que
volver a aplicar ni conflictos que resolver.

```bash
cp "../erp-puentum/ERP Financiera (standalone).html" ui/app.html
```

## Cómo se conecta, y por qué así

La app guarda **todo su estado en un solo documento** y lo toca en exactamente
dos momentos: lo lee entero al arrancar y lo escribe entero en cada cambio. Son
5 llamadas a `localStorage` en todo el prototipo.

Por eso el enganche es **el almacén, no el código**: `adaptador.js` reemplaza
`localStorage` antes de que la app arranque. La app sigue creyendo que guarda en
el navegador y en realidad habla con la API, sin enterarse de que existimos.

| Momento | Qué pasa de verdad |
|---|---|
| La app lee el documento | Ya está **incrustado** en la página por el servidor |
| La app escribe el documento | Se agrupa 400 ms y va a `PUT /estado` con la versión |
| La app cierra sesión | `DELETE /sesion` y vuelve al login |

**El estado viaja incrustado y no se busca con `fetch`** porque la app lee el
almacén de forma sincrónica en su constructor: si tuviera que esperar una
respuesta, arrancaría vacía y después pisaría todo al guardar.

## Lo que el adaptador agrega y el prototipo no tenía

Con `localStorage`, guardar **no falla nunca**. Contra un servidor sí:

- **otra persona guardó primero** → avisa y recarga, en vez de pisarle el trabajo;
- **se tocó un día cerrado** → muestra el motivo que devuelve la base;
- **se cayó la conexión** → lo dice.

Un guardado que falla en silencio es la peor forma de perder trabajo.
