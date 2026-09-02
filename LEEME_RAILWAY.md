# Railway: cómo está configurado, y por qué no está en el repositorio

Este archivo existe desde el primer día por un motivo concreto: **el proyecto de
Railway hay que rehacerlo del lado del cliente antes de entregar el sistema**, y la
configuración no viaja con el código. Sin esto habría que redescubrirla entera.

Mismo criterio que en SanluFilm, y hereda sus cicatrices.

## Identificadores

| Qué | Valor |
|---|---|
| Proyecto | `ERP Financiera` · `df6b54d5-5aaf-4de5-a7dd-2bb4981135b7` |
| Entorno | `production` · `345fd301-8e2b-4bda-8450-0d5356997ac8` |
| Servicio | `api` · `476b9269-e272-4b21-8b04-06d40f5604a7` |
| Dominio | `api-production-dc98.up.railway.app` |
| Base | Supabase `ERP Financiera`, ref `lbxfdouuzfljcubagdod`, región `us-east-1` |

## 🔴 Las tres trampas ya pagadas

**1. `railway.json` en la raíz se aplica a TODOS los servicios**, no sólo al que
tiene la raíz como *root directory*. En SanluFilm eso levantó la web con el comando
del worker y la tiró abajo. **Por eso en este repositorio no hay `railway.json`:**
la configuración va en la pantalla de cada servicio, campo por campo.

**2. Railway acumula los cambios y hay que aplicarlos.** Escribir un campo no lo
guarda: hay que confirmarlo y después desplegar. El comando por consola los deja en
espera **sin avisar**, y sale con código 0.

★ La regla: **el texto en el campo no es el valor guardado.** Se verifica leyendo la
configuración del servicio, nunca mirando la pantalla.

**3. El primer deploy falla si el comando de arranque no está puesto ANTES.**
Pasó acá, el 2/9: el servicio se creó y empezó a construir antes de que se
configurara el comando, y el build murió con `✖ No start command detected`. Y ojo,
**un redeploy no lo arregla**, porque reusa el build fallido: hay que disparar un
build nuevo (un commit sirve).

Railpack dice que arranca proyectos FastAPI solo, pero **no los detecta si el punto
de entrada no está en la raíz**. El nuestro es `api/main.py`, así que el comando
explícito es obligatorio.

**4. El dominio público queda sin puerto si se crea ANTES del primer deploy.**
Pasó acá el 2/9. El servicio arrancaba bien (uvicorn en `0.0.0.0:8080`, y el
healthcheck interno de `/health` devolvía 200), pero el dominio público respondía
`404 Application not found` de Railway. La causa: el dominio tenía
`targetPort: null`, así que el borde no sabía a dónde mandar el tráfico.

⚠️ **Y no se arregla por API.** `generate-domain` con `targetPort` **no actualiza**
un dominio que ya existe (devuelve `created: false`). Y el agente de Railway
informó que lo había cambiado, pero al leer el dominio seguía en `null`: otra vez
**el mensaje no es el artefacto**. Se arregla a mano en **Settings → Networking**,
poniendo el puerto **8080** en el dominio.

★ Para no repetirlo: **crear el dominio DESPUÉS del primer deploy exitoso**, así
Railway detecta el puerto solo.

## Servicios

### `api`
| Campo | Valor |
|---|---|
| Root directory | por defecto (la raíz) |
| Start command | `uvicorn api.main:app --host 0.0.0.0 --port $PORT` |
| Healthcheck | `/health`, 60 s |
| Restart policy | `ON_FAILURE`, 10 intentos |
| Sleep / serverless | **APAGADO** |
| Región | `us-east4-eqdc4a` (Virginia) ✅ verificado |

🔴 **La región no se puede configurar por API y quedó mal por defecto.** Railway la
puso en **Amsterdam** (`ams`). La base está en Virginia, así que cada consulta
cruzaría el Atlántico. **Cambiar a `us-east4` en Settings → Regions.**

⚠️ **El modo que duerme va apagado.** Railway lo apaga tras diez minutos sin
tráfico y el primer pedido después de despertar puede devolver error. El monitor lo
leería como caída: una alarma falsa cada mañana, y una alarma que suena sin que haya
nada roto enseña a ignorar las alarmas.

### `web`
Todavía no existe. Entra en la etapa 4, con root directory `/web`.

### `respaldo` (cron)
Todavía no existe. Es la copia propia fuera de la plataforma, todas las noches.

⚠️ **Va como cron, no como proceso encendido.** En SanluFilm eso es la diferencia
entre 48 minutos de cómputo por día y 1.440. Pero la razón buena es otra: **si una
corrida se cuelga, la siguiente arranca limpia.** Un bucle interno colgado se queda
colgado, y eso ya se pagó en Eurolab con el servicio de Sigma.

## Variables de entorno

| Variable | Estado | Valor |
|---|---|---|
| `ENTORNO` | ✅ puesta | `produccion`. Sólo `desarrollo` publica la documentación de la API |
| `DATABASE_URL` | ✅ puesta | Pooler **compartido** de Supabase, modo **sesión**, puerto **5432** |

⚠️ **No usar la conexión directa** (`db.<ref>.supabase.co`): es sólo IPv6, y el
servicio tiene el egreso IPv6 desactivado, así que no resolvería. **Y no usar el
modo transacción** (6543): no soporta sentencias preparadas ni `SET` de sesión.

La forma es:
`postgresql://postgres.<REF>:<PASSWORD>@aws-0-us-east-1.pooler.supabase.com:5432/postgres`

## Lo que se hace a mano, y no es un olvido

Cuatro cosas no tienen API. Quedan acá para que en la migración nadie las descubra
tarde:

1. **La región del servicio de Railway** (Settings → Regions). ✅ Hecho el 2/9: `us-east4`.
2. **El puerto del dominio público** (Settings → Networking → puerto 8080). Ver la trampa 4.
3. **Restaurar un respaldo de Supabase.** El endpoint de la API responde *"this
   endpoint is unavailable at the moment"*. Se hace en el panel: Database → Backups.
   Y el calendario de respaldos exige plan Enterprise.
4. **Crear el monitor en UptimeRobot.** `newMonitor` está bloqueado en el plan
   gratuito. El monitor apunta a `https://api-production-dc98.up.railway.app/health`
   y consulta con `HEAD`, que el endpoint ya soporta.
