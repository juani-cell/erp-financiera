# ERP Financiera

Sistema de gestión para financieras (mesa de cambio, cripto, cables y tesorería).
Producto multi-cliente: **un solo código, y las diferencias de cada cliente como
configuración en la base**, nunca como ramas por cliente.

## Cómo está partido

Dos servicios en este mismo repositorio, cada uno con su propio *root directory*
en Railway. Es el mismo patrón que ya corre en SanluFilm.

| Servicio | Carpeta | Qué es |
|---|---|---|
| `api` | `/` (raíz) | La API en Python. **Acá vive toda la regla de negocio.** |
| `web` | `/web` | Las pantallas en Next.js. Todavía no existe: entra en la etapa 4. |

**Por qué dos y no uno:** la API es Python y las pantallas son Next.js, así que no
pueden ser el mismo proceso. Y la separación no es un costo, es el requisito: está
planeado un acceso por chat (MCP) que es una capa fina sobre la API, de modo que si
un cálculo viviera en la pantalla, el chatbot daría un número distinto al que
muestra el sistema.

Orden de construcción, y el orden importa: **backend → API → web → MCP**.

## Correrlo local

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # y completar DATABASE_URL
uvicorn api.main:app --reload
```

Después, `curl -i localhost:8000/health` tiene que dar `200 ok`. Con la base caída
o mal configurada, `503`.

## Las cosas que no se negocian

Salen de decisiones ya tomadas y de errores ya pagados. Están para no volver a
discutirlas cada vez:

- **Los montos van en decimal exacto, nunca en coma flotante.** El prototipo usa
  coma flotante y así no puede salir a producción: los centavos se corren y después
  la caja no cuadra con el arqueo sin que nadie sepa por qué.
- **Toda regla de negocio vive en el backend**, no en las pantallas.
- **La auditoría se escribe con disparadores de la base**, no con código de la
  aplicación. Si un programa se olvida de escribir el registro, con disparador es
  imposible; con código de aplicación se pierde en silencio.
- **La validación de día cerrado va del lado del servidor**, con `409`, no sólo en
  la interfaz.
- **Nada de datos de un cliente en el ambiente de otro**, ni para probar.

## Dónde está lo demás

- **El stack y por qué:** `DECISIONES.md` en la carpeta de trabajo de Puentum, con
  cada opción descartada y su motivo. ⚠️ El README del repositorio del prototipo
  sugiere Node y Vercel: **eso quedó viejo**, no es lo que se decidió.
- **Las reglas de negocio:** el README del repositorio del prototipo (`ERP
  Financiera.dc.html` y sus documentos). Ante una duda entre ese documento y el
  código del prototipo, **gana el código**.
- **La configuración de Railway:** `LEEME_RAILWAY.md`, en este repositorio.
