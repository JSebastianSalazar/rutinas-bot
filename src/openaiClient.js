import OpenAI from 'openai';
import { config } from './config.js';
import { logger } from './logger.js';

export const openai = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * Ejecuta una funcion async con reintentos y backoff exponencial.
 * Reintenta en errores de red, rate limit (429) y 5xx.
 */
export async function withRetry(fn, { retries = 3, baseDelayMs = 1000, label = 'op' } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = err?.status ?? err?.response?.status;
      const retryable = status === undefined || status === 429 || (status >= 500 && status < 600);
      if (!retryable || attempt === retries) break;
      const delay = baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 250);
      logger.warn(
        { label, attempt: attempt + 1, status, delay },
        `Fallo en ${label}, reintentando...`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
