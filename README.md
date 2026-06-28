# Rutinas Bot

Servicio Node.js que cada día genera (con OpenAI) un plan de alimentación y
ejercicio para una pareja —uno de ellos en **lactancia/postparto**— y lo envía
por email en formato HTML. Incluye comidas, refuerzo para lactancia, caminata,
rutina de fuerza para él, rutina segura para ella, imágenes generadas por IA,
lista de compra y avisos de seguridad.

> ⚠️ **No es consejo médico.** Es una herramienta de apoyo a hábitos. No se
> presenta como médico, nutricionista ni fisioterapeuta. El email siempre
> incluye un aviso para consultar a un profesional.

## Cómo funciona

```
cron 07:00 (Europe/Madrid)
        │
        ▼
generateDailyPlan ── OpenAI chat (Structured Outputs) ──► JSON
        │                                                   │
        │                                          Zod (estructura)
        │                                          safetyRules (seguridad postparto)
        ▼
generateImages ── OpenAI images ──► guarda en data/images ──► URL pública /images/...
        │
        ▼
emailTemplate (HTML responsive) ──► sendEmail (Nodemailer) ──► ambos destinatarios
        │
        ▼
store ── guarda data/YYYY-MM-DD.json (historial, evita repetir comidas y regastar)
```

### Decisiones de diseño relevantes

- **Structured Outputs** (`response_format: json_schema`, `strict: true`): el
  JSON viene garantizado; Zod solo valida la semántica.
- **Seguridad determinista** (`safetyRules.js`): además del prompt, se revisa el
  JSON y se **regenera** si aparecen términos de dieta agresiva o ejercicios de
  impacto en la rutina de la mujer. El disclaimer médico se inyecta fijo.
- **Imágenes con URL estable**: se guardan en disco y se sirven por el propio
  Express en `PUBLIC_BASE_URL/images/...` (las URLs de OpenAI expiran). Para
  desactivarlas, `ENABLE_AI_IMAGES=false`.
- **Historial en JSON local** (`data/`): evita repetir comidas y permite reenviar
  sin volver a llamar (y pagar) a OpenAI.
- **Reintentos con backoff** en OpenAI y SMTP; alerta opcional por email si el
  job falla; lock para no solapar ejecuciones.

## Instalación

Requiere **Node.js 20+**.

```bash
npm install
cp .env.example .env
# edita .env con tus claves
```

## Variables de entorno

Ver [.env.example](.env.example). Claves:

| Variable | Descripción |
|---|---|
| `OPENAI_API_KEY` | Clave de OpenAI |
| `OPENAI_TEXT_MODEL` | Modelo de texto (def. `gpt-4o-mini`) |
| `OPENAI_IMAGE_MODEL` | Modelo de imagen (def. `gpt-image-1`) |
| `SMTP_HOST/PORT/USER/PASS` | Credenciales SMTP |
| `EMAIL_FROM` | Remitente |
| `EMAIL_TO_MAN` / `EMAIL_TO_WOMAN` | Destinatarios |
| `CRON_TIME` | Expresión cron (def. `0 7 * * *`) |
| `TIMEZONE` | Zona horaria (def. `Europe/Madrid`) |
| `PORT` | Puerto HTTP (def. `3000`) |
| `PUBLIC_BASE_URL` | URL pública del servicio (para las imágenes) |
| `ENABLE_AI_IMAGES` | `true`/`false` |
| `HISTORY_LOOKBACK_DAYS` | Días de historial para no repetir comidas |
| `ALERT_EMAIL` | Email para avisos de fallo (opcional) |
| `RUN_TOKEN` | Token para el endpoint `POST /run` (opcional) |

## Uso

```bash
npm start            # arranca servidor + scheduler
npm run dev          # con --watch
npm run send:test    # genera y ENVÍA el correo ahora (regenera)
npm run preview      # genera HTML en preview.html SIN enviar (sin imágenes IA)
npm run preview -- --images   # preview incluyendo imágenes IA
```

### Endpoints

- `GET /health` → estado del servicio.
- `GET /images/...` → imágenes generadas.
- `POST /run?token=RUN_TOKEN[&force=true]` → dispara el job manualmente en prod.

## Deploy en Railway

1. Sube el repo a GitHub y crea un proyecto en Railway → **Deploy from GitHub**.
2. En **Variables**, añade todas las de `.env.example` (sin comillas).
   - `PUBLIC_BASE_URL` = la URL pública que te asigna Railway (ej.
     `https://rutinas-bot-production.up.railway.app`).
   - `NODE_ENV=production`.
3. Railway detecta Node y ejecuta `npm start` automáticamente. Si no, configura
   el **Start Command**: `npm start`.
4. **Disco persistente** (recomendado): el historial y las imágenes se guardan en
   `data/`. Sin volumen, se borran en cada deploy. Añade un **Volume** montado en
   `/app/data` para conservarlos.
5. Asegúrate de que el servicio escuche en `process.env.PORT` (ya lo hace) y que
   el cron use `TIMEZONE` (ya lo hace explícitamente).

> **Render**: igual, con un Web Service; añade un Disk montado en `/app/data`.
> **VPS**: usa `pm2 start src/index.js --name rutinas-bot` y un reverse proxy.

### Nota sobre hosting "dormido"

Railway/Render en planes free pueden suspender el servicio por inactividad, y el
cron **no se dispara si el proceso está dormido**. Opciones:
- Plan que mantenga el servicio activo, **o**
- Un cron externo (p. ej. cron-job.org) que llame a `POST /run?token=...` a las
  07:00 en vez de depender de node-cron.

## Gmail como SMTP (rápido para pruebas)

Usa `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER` tu correo y
`SMTP_PASS` una **contraseña de aplicación** (no la normal; requiere 2FA).

## Migrar imágenes a un bucket (opcional)

Hoy se sirven desde el propio Express. Para producción seria, sube los buffers a
S3/R2/Cloudinary en `src/store.js → saveImage()` y devuelve la URL pública del
bucket. El resto del código no cambia.

## Estructura

```
src/
  index.js              servidor Express + arranque del scheduler
  scheduler.js          cron diario (node-cron, con timezone)
  job.js                orquesta plan → imágenes → email → guardado
  openaiClient.js       cliente OpenAI + withRetry (backoff)
  generateDailyPlan.js  prompt + Structured Outputs + validación
  generateImages.js     3 imágenes IA → disco → URL pública
  emailTemplate.js      HTML responsive + texto plano
  sendEmail.js          Nodemailer + alertas
  config.js             carga/valida .env
  safetyRules.js        validación determinista de seguridad + disclaimer
  schema.js             Zod + JSON Schema para OpenAI
  store.js              persistencia (planes + imágenes)
  logger.js             pino
scripts/
  sendTest.js           npm run send:test
  preview.js            npm run preview
```
