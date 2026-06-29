import nodemailer from 'nodemailer';
import { config } from './config.js';
import { withRetry } from './openaiClient.js';
import { logger } from './logger.js';

// EMAIL_FROM puede venir como "Nombre <correo@x.com>" o solo "correo@x.com".
function parseFrom(from) {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1] || 'Rutinas Bot', email: m[2] };
  return { name: 'Rutinas Bot', email: from.trim() };
}

// ---- SMTP (Nodemailer) ----
let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth: { user: config.email.smtp.user, pass: config.email.smtp.pass },
    });
  }
  return transporter;
}

async function sendViaSmtp({ from, to, subject, html, text }) {
  const tx = getTransporter();
  const info = await withRetry(
    () => tx.sendMail({ from, to, subject, html, text }),
    { label: 'smtp.sendMail', retries: 2 },
  );
  return { id: info.messageId };
}

// ---- Brevo (API HTTP, no usa puertos SMTP -> funciona en Railway) ----
async function sendViaBrevo({ from, to, subject, html, text }) {
  const sender = parseFrom(from);
  const body = {
    sender,
    to: to.map((email) => ({ email })),
    subject,
    htmlContent: html,
    textContent: text,
  };
  const send = async () => {
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': config.email.brevoKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const detail = await resp.text();
      const err = new Error(`Brevo respondio ${resp.status}: ${detail}`);
      err.status = resp.status;
      throw err;
    }
    return resp.json();
  };
  const data = await withRetry(send, { label: 'brevo.send', retries: 2 });
  return { id: data.messageId };
}

/**
 * Envia un correo a un destinatario concreto.
 */
async function sendOne({ to, subject, html, text }) {
  const from = config.email.from;
  const result =
    config.email.provider === 'brevo'
      ? await sendViaBrevo({ from, to: [to], subject, html, text })
      : await sendViaSmtp({ from, to: [to], subject, html, text });
  logger.info({ provider: config.email.provider, to, id: result.id }, 'Correo enviado');
  return { messageId: result.id };
}

/**
 * Envia los dos correos personalizados (hombre y mujer) por separado.
 * emailMan y emailWoman son el resultado de renderEmailMan/renderEmailWoman.
 */
export async function sendEmails({ emailMan, emailWoman }) {
  const [resMan, resWoman] = await Promise.all([
    sendOne({ to: config.email.toMan, ...emailMan }),
    sendOne({ to: config.email.toWoman, ...emailWoman }),
  ]);
  return { man: resMan, woman: resWoman };
}

/**
 * Envia un correo de alerta si ALERT_EMAIL esta configurado. Nunca lanza.
 */
export async function sendAlert(message) {
  if (!config.email.alert) return;
  try {
    const payload = {
      subject: '[Rutinas Bot] Fallo en el envio diario',
      html: `<pre>${message}</pre>`,
      text: message,
    };
    const from = config.email.from;
    const to = [config.email.alert];
    if (config.email.provider === 'brevo') {
      await sendViaBrevo({ from, to, ...payload });
    } else {
      await sendViaSmtp({ from, to, ...payload });
    }
  } catch (err) {
    logger.error({ err: err.message }, 'No se pudo enviar la alerta');
  }
}

export async function verifySmtp() {
  if (config.email.provider === 'smtp') {
    await getTransporter().verify();
    logger.info('Conexion SMTP verificada');
  } else {
    logger.info({ provider: config.email.provider }, 'Proveedor de email no-SMTP, sin verificacion previa');
  }
}
