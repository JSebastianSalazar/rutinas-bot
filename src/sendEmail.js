import nodemailer from 'nodemailer';
import { config } from './config.js';
import { withRetry } from './openaiClient.js';
import { logger } from './logger.js';

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transporter;
}

/**
 * Envia el correo a ambos destinatarios en un solo envio.
 */
export async function sendEmail({ subject, html, text }) {
  const tx = getTransporter();
  const info = await withRetry(
    () =>
      tx.sendMail({
        from: config.email.from,
        to: [config.email.toMan, config.email.toWoman],
        subject,
        html,
        text,
      }),
    { label: 'smtp.sendMail', retries: 2 },
  );
  logger.info({ messageId: info.messageId }, 'Correo enviado');
  return info;
}

/**
 * Envia un correo de alerta a ALERT_EMAIL si esta configurado. Nunca lanza.
 */
export async function sendAlert(message) {
  if (!config.email.alert) return;
  try {
    const tx = getTransporter();
    await tx.sendMail({
      from: config.email.from,
      to: config.email.alert,
      subject: '[Rutinas Bot] Fallo en el envio diario',
      text: message,
    });
  } catch (err) {
    logger.error({ err: err.message }, 'No se pudo enviar la alerta');
  }
}

export async function verifySmtp() {
  await getTransporter().verify();
  logger.info('Conexion SMTP verificada');
}
