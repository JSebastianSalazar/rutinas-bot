import OpenAI from 'openai';
import { config } from './config.js';
import { withRetry } from './openaiClient.js';
import { saveImage } from './store.js';
import { logger } from './logger.js';

function imagePrompts(plan) {
  // Usa el almuerzo compartido como imagen de comida principal.
  // Fallback a breakfast_man si lunch no existe (compatibilidad).
  const mainMealName =
    plan.nutrition?.lunch?.name ??
    plan.nutrition?.breakfast_man?.name ??
    'comida saludable casera';
  return {
    meal:
      `Fotografia cenital realista y apetitosa de ${mainMealName}, ` +
      `comida casera saludable en un plato, luz natural, estilo fotografia gastronomica, sin texto.`,
    strengthMan:
      'Ilustracion limpia y motivadora de un hombre adulto haciendo una rutina de fuerza en casa ' +
      '(sentadillas, flexiones, plancha), estilo plano y moderno, colores suaves, sin texto.',
    strengthWoman:
      'Ilustracion limpia y motivadora de una mujer adulta haciendo ejercicio suave de bajo impacto ' +
      '(movilidad, puente de gluteo, estiramientos) en casa, ambiente tranquilo y seguro, ' +
      'estilo plano y moderno, colores suaves, sin texto.',
  };
}

// ---- Pollinations: gratis, sin API key. Devuelve una URL estable de imagen. ----
function pollinationsUrl(prompt, seed) {
  const base = 'https://image.pollinations.ai/prompt/';
  const params = new URLSearchParams({
    width: '1024',
    height: '1024',
    nologo: 'true',
    seed: String(seed),
    model: 'flux',
  });
  return `${base}${encodeURIComponent(prompt)}?${params.toString()}`;
}

function buildPollinations(plan, date) {
  const prompts = imagePrompts(plan);
  // seed derivada de la fecha para que sea estable pero cambie cada dia.
  const seed = Number(date.replace(/-/g, '')) % 100000;
  return {
    meal: pollinationsUrl(prompts.meal, seed + 1),
    strengthMan: pollinationsUrl(prompts.strengthMan, seed + 2),
    strengthWoman: pollinationsUrl(prompts.strengthWoman, seed + 3),
  };
}

// ---- OpenAI: requiere saldo. Descarga la imagen y la sirve desde Express. ----
async function generateOpenAIImage(client, prompt, filename, date) {
  const res = await withRetry(
    () => client.images.generate({ model: config.image.openaiModel, prompt, size: '1024x1024', n: 1 }),
    { label: `openai.image.${filename}` },
  );
  const item = res.data?.[0];
  let buffer;
  if (item?.b64_json) {
    buffer = Buffer.from(item.b64_json, 'base64');
  } else if (item?.url) {
    const resp = await withRetry(() => fetch(item.url), { label: 'fetch.image' });
    buffer = Buffer.from(await resp.arrayBuffer());
  } else {
    throw new Error('La API de imagenes no devolvio b64_json ni url.');
  }
  return saveImage(`${date}-${filename}.png`, buffer);
}

async function buildOpenAI(plan, date) {
  const client = new OpenAI({ apiKey: config.image.openaiKey });
  const prompts = imagePrompts(plan);
  const tasks = {
    meal: generateOpenAIImage(client, prompts.meal, 'comida', date),
    strengthMan: generateOpenAIImage(client, prompts.strengthMan, 'fuerza-hombre', date),
    strengthWoman: generateOpenAIImage(client, prompts.strengthWoman, 'fuerza-mujer', date),
  };
  const entries = await Promise.allSettled(Object.values(tasks));
  const keys = Object.keys(tasks);
  const result = {};
  keys.forEach((key, i) => {
    const settled = entries[i];
    if (settled.status === 'fulfilled') {
      result[key] = settled.value;
    } else {
      logger.error({ key, err: settled.reason?.message }, 'Fallo generando imagen OpenAI');
      result[key] = null;
    }
  });
  return result;
}

/**
 * Devuelve { meal, strengthMan, strengthWoman } con URLs de imagen (o null).
 * Proveedor segun IMAGE_PROVIDER: pollinations | openai | none.
 */
export async function generateImages(plan, date = plan.date) {
  if (config.image.provider === 'none') {
    logger.info('Imagenes desactivadas (IMAGE_PROVIDER=none)');
    return { meal: null, strengthMan: null, strengthWoman: null };
  }
  if (config.image.provider === 'openai') {
    return buildOpenAI(plan, date);
  }
  // pollinations (por defecto): solo construye URLs, sin llamadas ni coste.
  logger.info('Imagenes via Pollinations (gratis)');
  return buildPollinations(plan, date);
}
