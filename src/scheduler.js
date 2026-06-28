import cron from 'node-cron';
import { config } from './config.js';
import { runDailyJob } from './job.js';
import { logger } from './logger.js';

let running = false;

export function startScheduler() {
  if (!cron.validate(config.cron.time)) {
    throw new Error(`CRON_TIME invalido: "${config.cron.time}"`);
  }

  const task = cron.schedule(
    config.cron.time,
    async () => {
      // Evita solapamiento si una ejecucion previa sigue en curso.
      if (running) {
        logger.warn('Job anterior aun en ejecucion, se omite este disparo');
        return;
      }
      running = true;
      logger.info('Disparo de cron: ejecutando job diario');
      try {
        await runDailyJob();
      } finally {
        running = false;
      }
    },
    { timezone: config.cron.timezone },
  );

  logger.info(
    { cron: config.cron.time, tz: config.cron.timezone },
    'Scheduler iniciado',
  );
  return task;
}
