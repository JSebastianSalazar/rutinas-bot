// Genera el plan y escribe el HTML a preview.html SIN enviar correo.
// Por defecto NO genera imagenes IA (ahorra coste). Pasa --images para incluirlas.
// Uso: npm run preview  |  npm run preview -- --images
import fs from 'node:fs/promises';
import { generateDailyPlan } from '../src/generateDailyPlan.js';
import { generateImages } from '../src/generateImages.js';
import { renderEmail } from '../src/emailTemplate.js';
import { logger } from '../src/logger.js';

async function main() {
  const withImages = process.argv.includes('--images');
  const plan = await generateDailyPlan();
  const images = withImages ? await generateImages(plan) : {};
  const { html, subject } = renderEmail(plan, images);
  await fs.writeFile('preview.html', html, 'utf8');
  logger.info({ subject }, 'preview.html generado');
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err: err.message, stack: err.stack }, 'preview error');
  process.exit(1);
});
