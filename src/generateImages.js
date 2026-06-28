import { openai, withRetry } from './openaiClient.js';
import { config } from './config.js';
import { saveImage } from './store.js';
import { logger } from './logger.js';

function imagePrompts(plan) {
  return {
    meal: `Fotografia cenital realista y apetitosa de "${plan.nutrition.meal1.name}", ` +
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

async function generateOne(prompt, filename, date) {
  const res = await withRetry(
    () =>
      openai.images.generate({
        model: config.openai.imageModel,
        prompt,
        size: '1024x1024',
        n: 1,
      }),
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

  const fullName = `${date}-${filename}.png`;
  return saveImage(fullName, buffer);
}

/**
 * Genera las 3 imagenes y devuelve un objeto con URLs publicas.
 * Si una imagen falla, se omite (null) para no bloquear el envio del email.
 */
export async function generateImages(plan, date = plan.date) {
  if (!config.features.aiImages) {
    logger.info('Imagenes IA desactivadas (ENABLE_AI_IMAGES=false)');
    return { meal: null, strengthMan: null, strengthWoman: null };
  }

  const prompts = imagePrompts(plan);
  const tasks = {
    meal: generateOne(prompts.meal, 'comida', date),
    strengthMan: generateOne(prompts.strengthMan, 'fuerza-hombre', date),
    strengthWoman: generateOne(prompts.strengthWoman, 'fuerza-mujer', date),
  };

  const entries = await Promise.allSettled(Object.values(tasks));
  const keys = Object.keys(tasks);
  const result = {};
  keys.forEach((key, i) => {
    const settled = entries[i];
    if (settled.status === 'fulfilled') {
      result[key] = settled.value;
    } else {
      logger.error({ key, err: settled.reason?.message }, 'Fallo generando imagen');
      result[key] = null;
    }
  });
  return result;
}
