import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

export { DATA_DIR, IMAGES_DIR };

async function ensureDirs() {
  await fs.mkdir(IMAGES_DIR, { recursive: true });
}

function planPath(date) {
  return path.join(DATA_DIR, `${date}.json`);
}

export async function savePlan(date, payload) {
  await ensureDirs();
  await fs.writeFile(planPath(date), JSON.stringify(payload, null, 2), 'utf8');
}

export async function loadPlan(date) {
  try {
    const raw = await fs.readFile(planPath(date), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Devuelve los nombres de comidas de los ultimos N dias, para pedirle al
 * modelo que no las repita.
 */
export async function recentMealNames(lookbackDays = config.features.historyLookbackDays) {
  await ensureDirs();
  let files;
  try {
    files = await fs.readdir(DATA_DIR);
  } catch {
    return [];
  }
  const jsonFiles = files
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .reverse()
    .slice(0, lookbackDays);

  const names = [];
  for (const file of jsonFiles) {
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
      const data = JSON.parse(raw);
      const plan = data.plan ?? data;
      if (plan?.nutrition?.meal1?.name) names.push(plan.nutrition.meal1.name);
      if (plan?.nutrition?.meal2?.name) names.push(plan.nutrition.meal2.name);
    } catch (err) {
      logger.warn({ file, err: err.message }, 'No se pudo leer plan reciente');
    }
  }
  return [...new Set(names)];
}

export async function saveImage(filename, buffer) {
  await ensureDirs();
  const target = path.join(IMAGES_DIR, filename);
  await fs.writeFile(target, buffer);
  return `${config.server.publicBaseUrl}/images/${filename}`;
}
