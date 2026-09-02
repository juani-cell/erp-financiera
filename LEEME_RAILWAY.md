# Railway: cómo está configurado, y por qué no está en el repositorio

Este archivo existe desde el primer día por un motivo concreto: **el proyecto de
Railway hay que rehacerlo del lado del cliente antes de entregar el sistema**, y la
configuración no viaja con el código. Sin esto habría que redescubrirla entera.

Es el mismo criterio que en SanluFilm, y hereda sus dos cicatrices.

## 🔴 Las dos trampas, heredadas de SanluFilm

**1. `railway.json` en la raíz se aplica a TODOS los servicios**, no sólo al que
tiene la raíz como *root directory*. En SanluFilm eso levantó la web con el comando
del worker y la tiró abajo. **Por eso en este repositorio no hay `railway.json`:**
la configuración va en la pantalla de cada servicio, campo por campo.

**2. Railway acumula los cambios de configuración y hay que aplicarlos.** Escribir
un campo no lo guarda: hay que confirmarlo con su tilde y después apretar Deploy,
como un commit con push. Y el comando de edición por consola **los deja en espera
sin avisar**, sale con código 0.

★ La regla que queda: **el texto en el campo no es el valor guardado.** Se verifica
con `railway status`, nunca mirando la pantalla.

## Servicios

### `api`
| Campo | Valor |
|---|---|
| Root directory | `/` (la raíz) |
| Start command | `uvicorn api.main:app --host 0.0.0.0 --port $PORT` |
| Región | `us-east4` (Virginia) |
| Serverless / sleep | **APAGADO** (ver abajo) |

⚠️ **La región no es un detalle.** La base está en `us-east-1` (Virginia), y la
aplicación tiene que estar en el mismo lugar. Si quedan separadas, cada consulta
cruza el continente: una pantalla pasa de ~130 ms a más de un segundo.

⚠️ **El modo que duerme el servicio va apagado.** Railway lo apaga tras diez
minutos sin tráfico, y el primer pedido después de despertar puede devolver error.
El monitor lo leería como caída: una alarma falsa cada mañana. Y una alarma que
suena sin que haya nada roto enseña a ignorar las alarmas.

### `web`
Todavía no existe. Entra en la etapa 4, con root directory `/web`.

### `respaldo` (cron)
Todavía no existe. Es la copia propia fuera de la plataforma, todas las noches.

⚠️ **Va como cron, no como proceso encendido.** En SanluFilm eso es la diferencia
entre 48 minutos de cómputo por día y 1.440, unas treinta veces más barato. Pero la
razón buena es otra: **si una corrida se cuelga, la siguiente arranca limpia.** Un
bucle interno que se cuelga se queda colgado, y eso ya se pagó en Eurolab con el
servicio de Sigma.

## Variables de entorno

| Variable | Dónde sale |
|---|---|
| `DATABASE_URL` | Pooler **compartido** de Supabase en modo **sesión**, puerto 5432. Ver `.env.example` |
| `ENTORNO` | `produccion`. Sólo `desarrollo` publica la documentación de la API |

⚠️ **No usar la conexión directa** (`db.<ref>.supabase.co`): es sólo IPv6 y desde
Railway puede no resolver. Y **no usar el modo transacción** (puerto 6543): no
soporta sentencias preparadas ni `SET` de sesión.

## Lo que se hace a mano, y no es un olvido

Dos cosas no tienen API y hay que hacerlas con el mouse. Quedan acá para que en la
migración nadie las descubra tarde:

- **Restaurar un respaldo de Supabase.** El endpoint de la API responde *"this
  endpoint is unavailable at the moment"*. Se hace en el panel: Database → Backups.
  Y el calendario de respaldos exige plan Enterprise.
- **Crear el monitor en UptimeRobot.** `newMonitor` está bloqueado en el plan
  gratuito.
