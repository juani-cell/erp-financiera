# El esquema

Una base **por cliente** (ver `DECISIONES.md`, 26/8), así que acá no hay
`tenant_id` ni RLS multi-inquilino.

| Archivo | Qué hace |
|---|---|
| `001_base.sql` | Tablas, dominios y restricciones |
| `002_auditoria_y_dia_cerrado.sql` | Los dos controles, como disparadores |
| `probar_controles.sql` | Prueba que los controles **atrapan lo que dicen** |

## Las cuatro cosas que el esquema hace cumplir por construcción

1. **La plata es decimal exacto.** El dominio `monto` es `numeric(20,6)`. Nunca
   coma flotante: `0.1 + 0.2` no da `0.3` y en los libros eso se acumula.
2. **`pata` guarda SI está completada y CUÁNDO, en dos campos.** No se pueden
   colapsar: existe *"completada pero no se sabe cuándo"* (dato migrado, o una
   pata de cuenta corriente que arrancó completada), y ese caso imputa a la
   fecha de la operación. Fue una corrección real a mi diseño: ver
   `DECISIONES.md` del 5/9.
3. **Las monedas viven en una tabla.** Alaska las tenía como columnas del
   movimiento y agregar una no fluía a las operaciones.
4. **La auditoría no se puede borrar.** `erp_app` tiene sólo `SELECT` sobre
   `auditoria`; las filas entran por un disparador `SECURITY DEFINER`. El
   prototipo hace `d.audit = []` dentro de la función que corre en cada carga:
   acá eso no puede pasar.

## El día cerrado se evalúa contra la fecha relevante de CADA acción

Es la regla de Agus, y es el arreglo de fondo del bug que reportó:

- **completar** una pata impacta HOY → se bloquea si **hoy** está cerrado
- **reabrir** una pata deshace un movimiento ya contado → se bloquea si está
  cerrado **el día en que esa pata se liquidó**

Con esto, cerrar el día deja de trabar la operación normal: se puede terminar de
entregar mañana lo que quedó pendiente ayer, y el día cerrado queda intacto.

## Correr el test

```bash
python3 -c "import json;print(json.dumps({'query':open('esquema/probar_controles.sql').read()}))" > /tmp/p.json
curl -s -X POST "https://api.supabase.com/v1/projects/$SUPABASE_ERP_REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
  --data-binary @/tmp/p.json
```

Corre entero adentro de una transacción que **revierte**: no deja rastro.
Prueba las 11 reglas **por los dos lados**, que es lo que importa: un control
que bloquea todo también pasaría la mitad de un test que sólo mire rechazos.

⚠️ **Usar `curl`, no `urllib`**: Cloudflare bloquea el User-Agent de Python
delante de la API de Supabase y devuelve un 403 con "error code: 1010", sin
detalle. Se pierde un rato largo buscando un problema de permisos que no existe.

## 🔴 Restricción para la carga inicial (Etapa 5)

El importador tiene que cargar **toda la historia primero y escribir los cierres
al final**. Si va cerrando a medida que avanza, el disparador lo bloquea a sí
mismo: agregar una pata a un día ya cerrado está prohibido, y con razón.

Lo destapó el test, no un incidente.
