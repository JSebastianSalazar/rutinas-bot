import express from 'express';
import { config } from './config.js';
import { startScheduler } from './scheduler.js';
import { runDailyJob } from './job.js';
import { IMAGES_DIR } from './store.js';
import { logger } from './logger.js';

const app = express();

// Servir las imagenes generadas como estaticos (URLs estables para el email).
app.use('/images', express.static(IMAGES_DIR, { maxAge: '7d' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), tz: config.cron.timezone });
});

// Disparo manual protegido por token simple (?token=...), util para probar en prod.
app.post('/run', async (req, res) => {
  const token = req.query.token;
  if (!process.env.RUN_TOKEN || token !== process.env.RUN_TOKEN) {
    return res.status(401).json({ error: 'no autorizado' });
  }
  const result = await runDailyJob({ force: req.query.force === 'true' });
  res.status(result.ok ? 200 : 500).json(result);
});

app.listen(config.server.port, () => {
  logger.info({ port: config.server.port }, 'Servidor HTTP escuchando');
  startScheduler();
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason: String(reason) }, 'unhandledRejection');
});
process.on('uncaughtException', (err) => {
  logger.error({ err: err.message, stack: err.stack }, 'uncaughtException');
});
