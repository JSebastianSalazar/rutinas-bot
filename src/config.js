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

export const config = {
  openai: {
    apiKey: required('OPENAI_API_KEY'),
    textModel: optional('OPENAI_TEXT_MODEL', 'gpt-4o-mini'),
    imageModel: optional('OPENAI_IMAGE_MODEL', 'gpt-image-1'),
  },
  smtp: {
    host: required('SMTP_HOST'),
    port: Number(optional('SMTP_PORT', '587')),
    user: required('SMTP_USER'),
    pass: required('SMTP_PASS'),
    secure: Number(optional('SMTP_PORT', '587')) === 465,
  },
  email: {
    from: required('EMAIL_FROM'),
    toMan: required('EMAIL_TO_MAN'),
    toWoman: required('EMAIL_TO_WOMAN'),
    alert: optional('ALERT_EMAIL', ''),
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
    aiImages: bool('ENABLE_AI_IMAGES', true),
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
