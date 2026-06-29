import { generateDailyPlan } from './generateDailyPlan.js';
import { generateImages } from './generateImages.js';
import { renderEmailMan, renderEmailWoman } from './emailTemplate.js';
import { sendEmails, sendAlert } from './sendEmail.js';
import { savePlan, loadPlan } from './store.js';
import { todayInTimezone, weekdayInTimezone } from './config.js';
import { logger } from './logger.js';

/**
 * Ejecuta el flujo completo del dia: generar plan, imagenes, render y envio.
 * @param {object} opts
 * @param {boolean} opts.force  Regenera aunque ya exista plan guardado.
 */
export async function runDailyJob({ force = false } = {}) {
  const date = todayInTimezone();
  const weekday = weekdayInTimezone();

  try {
    let stored = force ? null : await loadPlan(date);

    let plan;
    let images;

    if (stored?.plan) {
      logger.info({ date }, 'Reutilizando plan guardado (no se regenera)');
      plan = stored.plan;
      images = stored.images ?? {};
    } else {
      plan = await generateDailyPlan({ date, weekday });
      images = await generateImages(plan, date);
      await savePlan(date, { plan, images, generatedAt: new Date().toISOString() });
    }

    const emailMan = renderEmailMan(plan, images);
    const emailWoman = renderEmailWoman(plan, images);
    const info = await sendEmails({ emailMan, emailWoman });

    logger.info({ date, man: info.man.messageId, woman: info.woman.messageId }, 'Job diario completado');
    return { ok: true, date, man: info.man.messageId, woman: info.woman.messageId };
  } catch (err) {
    logger.error({ date, err: err.message, stack: err.stack }, 'Job diario FALLO');
    await sendAlert(`El job del ${date} fallo: ${err.message}`);
    return { ok: false, date, error: err.message };
  }
}
