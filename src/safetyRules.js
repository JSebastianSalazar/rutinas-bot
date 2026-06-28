// Validacion DETERMINISTA de seguridad despues de generar el plan.
// No confiamos solo en el prompt: revisamos el JSON y bloqueamos contenido
// inseguro para una mujer en lactancia/postparto.

// Disclaimer fijo que SIEMPRE se incrusta en el email (no depende del LLM).
export const MEDICAL_DISCLAIMER =
  'Este plan es orientativo y de apoyo a habitos saludables. No sustituye el ' +
  'consejo de un medico, nutricionista o fisioterapeuta. Consulta a un ' +
  'profesional de salud antes de empezar, y deten cualquier actividad y busca ' +
  'atencion si aparece: mareo, dolor, sangrado, cesarea reciente, baja ' +
  'produccion de leche, lesion o enfermedad.';

// Terminos prohibidos en TODO el plan (dietas agresivas).
const GLOBAL_BANNED = [
  'ayuno',
  'ayunar',
  'detox',
  'quema grasa',
  'quemagrasa',
  'deficit calorico',
  'déficit calórico',
  'baja en calorias',
  'baja en calorías',
  'dieta restrictiva',
  'pierde peso rapido',
  'adelgaza rapido',
];

// Terminos prohibidos especificamente en la rutina de la mujer (postparto/lactancia).
const WOMAN_BANNED = [
  'hiit',
  'burpee',
  'salto',
  'saltos',
  'jumping',
  'sprint',
  'crunch',
  'abdominal intenso',
  'sit-up',
  'sit up',
  'carga alta',
  'peso alto',
  'maximo esfuerzo',
  'máximo esfuerzo',
  'al fallo',
];

function flatten(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(flatten).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(flatten).join(' ');
  return '';
}

function findBanned(text, list) {
  const lower = text.toLowerCase();
  return list.filter((term) => lower.includes(term));
}

/**
 * Revisa el plan. Devuelve { ok, violations }.
 * Si ok === false, el llamador debe regenerar o abortar.
 */
export function checkSafety(plan) {
  const violations = [];

  const wholeText = flatten(plan);
  const globalHits = findBanned(wholeText, GLOBAL_BANNED);
  for (const hit of globalHits) {
    violations.push(`Termino de dieta agresiva detectado en el plan: "${hit}"`);
  }

  const womanText = flatten(plan.strength_woman);
  const womanHits = findBanned(womanText, WOMAN_BANNED);
  for (const hit of womanHits) {
    violations.push(`Ejercicio no apto para postparto/lactancia: "${hit}"`);
  }

  if (!plan.safety_note || plan.safety_note.trim().length < 10) {
    violations.push('Falta safety_note o es demasiado corta.');
  }

  return { ok: violations.length === 0, violations };
}
