import dotenv from 'dotenv';

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }
  return value.trim();
}

function optional(name, fallback = '') {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

function bool(name, fallback = false) {
  const value = optional(name, String(fallback)).toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

// Proveedor de texto: 'groq' (gratis) u 'openai'.
const textProvider = optional('AI_TEXT_PROVIDER', 'groq').toLowerCase();
// Proveedor de imagenes: 'pollinations' (gratis), 'openai' o 'none'.
const imageProvider = optional('IMAGE_PROVIDER', 'pollinations').toLowerCase();
// Proveedor de email: 'brevo' (API HTTP, recomendado) o 'smtp'.
const emailProvider = optional('EMAIL_PROVIDER', 'smtp').toLowerCase();

const TEXT_DEFAULTS = {
  groq: { baseURL: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  openai: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
};

function textConfig() {
  if (textProvider === 'groq') {
    return {
      provider: 'groq',
      apiKey: required('GROQ_API_KEY'),
      baseURL: TEXT_DEFAULTS.groq.baseURL,
      model: optional('GROQ_MODEL', TEXT_DEFAULTS.groq.model),
    };
  }
  // openai
  return {
    provider: 'openai',
    apiKey: required('OPENAI_API_KEY'),
    baseURL: TEXT_DEFAULTS.openai.baseURL,
    model: optional('OPENAI_TEXT_MODEL', TEXT_DEFAULTS.openai.model),
  };
}

export const config = {
  text: textConfig(),
  image: {
    provider: imageProvider, // pollinations | openai | none
    openaiModel: optional('OPENAI_IMAGE_MODEL', 'gpt-image-1'),
    // OPENAI_API_KEY solo se exige si se generan imagenes con openai.
    openaiKey: imageProvider === 'openai' ? required('OPENAI_API_KEY') : optional('OPENAI_API_KEY', ''),
  },
  // Proveedor de envio: 'brevo' (API HTTP, recomendado en Railway) | 'smtp'.
  email: {
    provider: emailProvider,
    from: required('EMAIL_FROM'),
    toMan: required('EMAIL_TO_MAN'),
    toWoman: required('EMAIL_TO_WOMAN'),
    alert: optional('ALERT_EMAIL', ''),
    // Brevo (solo si EMAIL_PROVIDER=brevo)
    brevoKey: emailProvider === 'brevo' ? required('BREVO_API_KEY') : optional('BREVO_API_KEY', ''),
    // SMTP (solo si EMAIL_PROVIDER=smtp)
    smtp: {
      host: emailProvider === 'smtp' ? required('SMTP_HOST') : optional('SMTP_HOST', ''),
      port: Number(optional('SMTP_PORT', '587')),
      user: emailProvider === 'smtp' ? required('SMTP_USER') : optional('SMTP_USER', ''),
      pass: emailProvider === 'smtp' ? required('SMTP_PASS') : optional('SMTP_PASS', ''),
      secure: Number(optional('SMTP_PORT', '587')) === 465,
    },
  },
  cron: {
    time: optional('CRON_TIME', '0 7 * * *'),
    timezone: optional('TIMEZONE', 'Europe/Madrid'),
  },
  server: {
    port: Number(optional('PORT', '3000')),
    publicBaseUrl: optional('PUBLIC_BASE_URL', 'http://localhost:3000').replace(/\/$/, ''),
  },
  features: {
    aiImages: imageProvider !== 'none',
    historyLookbackDays: Number(optional('HISTORY_LOOKBACK_DAYS', '5')),
  },
};

export function todayInTimezone(timezone = config.cron.timezone) {
  // Devuelve YYYY-MM-DD en la zona horaria configurada.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
}

export function weekdayInTimezone(timezone = config.cron.timezone) {
  const fmt = new Intl.DateTimeFormat('es-ES', {
    timeZone: timezone,
    weekday: 'long',
  });
  return fmt.format(new Date());
}
