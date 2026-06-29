import { textClient, withRetry } from './openaiClient.js';
import { config, todayInTimezone, weekdayInTimezone } from './config.js';
import { dailyPlanSchema, dailyPlanJsonSchema } from './schema.js';
import { checkSafety } from './safetyRules.js';
import { recentMealNames } from './store.js';
import { logger } from './logger.js';

const SYSTEM_PROMPT = `Eres un asistente que genera planes diarios de habitos saludables (alimentacion y movimiento) para una pareja. NO eres medico, nutricionista ni fisioterapeuta, y no debes presentarte como tal ni dar diagnosticos ni dosis de suplementos.

PERFIL:
- Hombre: 80 kg, sano, objetivo recomposicion y fuerza general.
- Mujer: 80 kg, en periodo de LACTANCIA y postparto. NO le gustan los huevos en ninguna presentacion.

REGLAS INNEGOCIABLES (lactancia/postparto):
- PROHIBIDO para ella: ayuno, deficit calorico marcado, "detox", "quema grasa", dietas restrictivas o bajas en calorias.
- Prioriza para ella: energia suficiente, proteina, hidratacion abundante, fibra, grasas saludables (omega-3), hierro, calcio, yodo y folato.
- Ejercicio de ella SOLO de bajo impacto: caminata, movilidad, sentadilla suave, puente de gluteo, remo con banda o mochila ligera, respiracion diafragmatica, bird-dog suave.
- PROHIBIDO para ella: impacto, saltos, HIIT, burpees, sprints, abdominales intensos (crunches/sit-ups), cargas altas, entrenar al fallo.
- Anade siempre la condicion "solo si no hay dolor ni contraindicacion".

ALIMENTACION - ESTRUCTURA DEL DIA:
Genera 4 momentos de comida con estas reglas:

1. breakfast_man (desayuno del hombre): puede incluir huevos, proteina alta, energetico.
2. breakfast_woman (desayuno de la mujer): NUNCA huevos ni derivados directos como tortilla o revuelto. Usa alternativas proteicas: yogur griego, queso fresco, tofu, legumbres, frutos secos, semillas, avena con proteina vegetal. Rico en calcio y energia para lactancia.
3. lunch (almuerzo compartido para los dos): comida completa, proteina + carbohidrato + verdura.
4. snack (merienda/algo compartido): ligero, nutritivo, facil de preparar. Bueno para energia de tarde.
5. lactation_extra: refuerzo extra especifico para produccion de leche (caldo, infusion, fruta con omega-3, etc).

- Comidas realistas, ingredientes comunes y economicos, pasos breves, estimacion de proteina por comida.
- Sin productos milagro ni suplementos con dosis.
- Varia el tipo de coccion y origen de proteina cada dia (no siempre pollo, no siempre lo mismo).

EJERCICIO HOMBRE:
- Fuerza progresiva de cuerpo completo: sentadillas, flexiones, remo, peso muerto con mochila, zancadas, plancha. 3-4 series por ejercicio.
- En cada ejercicio indica: series x repeticiones, descanso, intensidad RPE y alternativa sin material.

CAMINAR (ambos): entre 30 y 60 minutos, divisible en 2 caminatas.

SEGURIDAD: el campo safety_note debe recomendar consultar a un profesional si aparece mareo, dolor, cesarea reciente, baja produccion de leche, sangrado, lesion o enfermedad.

Responde SIEMPRE en espanol, tono cercano y motivador, frases cortas. Devuelve EXCLUSIVAMENTE un objeto JSON valido, sin texto adicional, sin markdown y sin bloques de codigo.

El JSON debe tener EXACTAMENTE esta estructura (rellena los valores, respeta las claves):
{
  "title": "string",
  "date": "YYYY-MM-DD",
  "nutrition": {
    "breakfast_man": { "name": "string", "ingredients": ["string"], "steps": ["string"], "protein_estimate": "string" },
    "breakfast_woman": { "name": "string", "ingredients": ["string"], "steps": ["string"], "protein_estimate": "string" },
    "lunch": { "name": "string", "ingredients": ["string"], "steps": ["string"], "protein_estimate": "string" },
    "snack": { "name": "string", "ingredients": ["string"], "description": "string" },
    "lactation_extra": { "name": "string", "ingredients": ["string"], "reason": "string" }
  },
  "walking": { "goal": "string", "instructions": "string" },
  "strength_man": { "warmup": ["string"], "exercises": ["string"], "cooldown": ["string"] },
  "strength_woman": { "warmup": ["string"], "exercises": ["string"], "cooldown": ["string"] },
  "shopping_list": ["string"],
  "hydration": "string",
  "safety_note": "string"
}`;

function buildUserPrompt({ date, weekday, lastMeals }) {
  const avoid =
    lastMeals.length > 0
      ? `Evita repetir estas comidas recientes: ${lastMeals.join('; ')}.`
      : 'Es el primer plan, elige comidas variadas.';
  return `Genera el plan para la fecha ${date} (${weekday}).
${avoid}
Varia ingredientes y el tipo de ejercicio respecto a los dias anteriores.
El campo "date" debe ser exactamente "${date}".`;
}

/**
 * Genera y valida el plan diario. Reintenta la generacion si la validacion de
 * seguridad falla.
 */
export async function generateDailyPlan({ date = todayInTimezone(), weekday = weekdayInTimezone() } = {}) {
  const lastMeals = await recentMealNames();
  const userPrompt = buildUserPrompt({ date, weekday, lastMeals });

  const maxSafetyRetries = 2;
  for (let attempt = 0; attempt <= maxSafetyRetries; attempt++) {
    // OpenAI soporta Structured Outputs (json_schema). Groq y otros usan el
    // modo JSON generico (json_object) + el esqueleto descrito en el prompt.
    const responseFormat =
      config.text.provider === 'openai'
        ? { type: 'json_schema', json_schema: dailyPlanJsonSchema }
        : { type: 'json_object' };

    const completion = await withRetry(
      () =>
        textClient.chat.completions.create({
          model: config.text.model,
          temperature: 0.7,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          response_format: responseFormat,
        }),
      { label: `${config.text.provider}.chat.plan` },
    );

    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error('El modelo no devolvio contenido para el plan.');

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      throw new Error(`No se pudo parsear el JSON del plan: ${err.message}`);
    }

    // Validacion estructural con Zod.
    const result = dailyPlanSchema.safeParse(parsed);
    if (!result.success) {
      logger.warn({ issues: result.error.issues }, 'Plan no cumple el schema Zod');
      if (attempt === maxSafetyRetries) {
        throw new Error('El plan no cumple el schema tras varios intentos.');
      }
      continue;
    }

    const plan = result.data;
    plan.date = date; // forzamos la fecha correcta

    // Validacion de seguridad determinista.
    const safety = checkSafety(plan);
    if (!safety.ok) {
      logger.warn({ violations: safety.violations }, 'Plan rechazado por reglas de seguridad');
      if (attempt === maxSafetyRetries) {
        throw new Error(`Plan inseguro tras varios intentos: ${safety.violations.join('; ')}`);
      }
      continue;
    }

    logger.info({ date, attempt }, 'Plan generado y validado');
    return plan;
  }

  throw new Error('No se pudo generar un plan valido.');
}
