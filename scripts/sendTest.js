// Envia el correo del dia manualmente (regenera el plan).
// Uso: npm run send:test
import { runDailyJob } from '../src/job.js';
import { verifySmtp } from '../src/sendEmail.js';
import { logger } from '../src/logger.js';

async function main() {
  await verifySmtp();
  const result = await runDailyJob({ force: true });
  if (!result.ok) {
    logger.error(result, 'send:test fallo');
    process.exit(1);
  }
  logger.info(result, 'send:test completado');
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err: err.message, stack: err.stack }, 'send:test error fatal');
  process.exit(1);
});
