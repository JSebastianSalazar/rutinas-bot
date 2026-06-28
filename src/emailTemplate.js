import { MEDICAL_DISCLAIMER } from './safetyRules.js';

function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function list(items = []) {
  return `<ul style="margin:8px 0;padding-left:20px;color:#374151;">${items
    .map((i) => `<li style="margin:4px 0;">${esc(i)}</li>`)
    .join('')}</ul>`;
}

function section(title, inner) {
  return `
  <tr><td style="padding:24px 24px 0 24px;">
    <h2 style="margin:0 0 8px 0;font-size:18px;color:#111827;">${esc(title)}</h2>
    ${inner}
  </td></tr>`;
}

function image(url, alt) {
  if (!url) return '';
  return `<div style="margin:12px 0;"><img src="${esc(url)}" alt="${esc(alt)}" width="100%" style="max-width:552px;border-radius:12px;display:block;" /></div>`;
}

function meal(m) {
  return `
    <div style="background:#f9fafb;border-radius:12px;padding:16px;margin:8px 0;">
      <h3 style="margin:0 0 4px 0;font-size:16px;color:#111827;">${esc(m.name)}</h3>
      <p style="margin:0 0 8px 0;font-size:13px;color:#059669;font-weight:600;">Proteina aprox.: ${esc(m.protein_estimate)}</p>
      <strong style="font-size:13px;color:#6b7280;">Ingredientes</strong>
      ${list(m.ingredients)}
      <strong style="font-size:13px;color:#6b7280;">Preparacion</strong>
      ${list(m.steps)}
    </div>`;
}

function strengthBlock(block) {
  return `
    <strong style="font-size:13px;color:#6b7280;">Calentamiento</strong>
    ${list(block.warmup)}
    <strong style="font-size:13px;color:#6b7280;">Ejercicios</strong>
    ${list(block.exercises)}
    <strong style="font-size:13px;color:#6b7280;">Vuelta a la calma</strong>
    ${list(block.cooldown)}`;
}

export function renderEmail(plan, images = {}) {
  const subject = `${plan.title} - ${plan.date}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">

        <tr><td style="background:#10b981;padding:28px 24px;">
          <h1 style="margin:0;font-size:22px;color:#ffffff;">${esc(plan.title)}</h1>
          <p style="margin:6px 0 0 0;font-size:14px;color:#d1fae5;">${esc(plan.date)}</p>
        </td></tr>

        ${section('Comida 1', meal(plan.nutrition.meal1) + image(images.meal, 'Comida del dia'))}
        ${section('Comida 2', meal(plan.nutrition.meal2))}
        ${section('Refuerzo opcional para lactancia', `
          <div style="background:#fef3c7;border-radius:12px;padding:16px;">
            <h3 style="margin:0 0 4px 0;font-size:16px;color:#111827;">${esc(plan.nutrition.lactation_extra.name)}</h3>
            <p style="margin:0 0 8px 0;font-size:13px;color:#92400e;">${esc(plan.nutrition.lactation_extra.reason)}</p>
            ${list(plan.nutrition.lactation_extra.ingredients)}
          </div>`)}

        ${section('Caminata diaria', `
          <p style="margin:0 0 6px 0;font-weight:600;color:#111827;">${esc(plan.walking.goal)}</p>
          <p style="margin:0;color:#374151;">${esc(plan.walking.instructions)}</p>`)}

        ${section('Fuerza - Hombre', strengthBlock(plan.strength_man) + image(images.strengthMan, 'Rutina de fuerza hombre'))}
        ${section('Fuerza segura - Mujer (lactancia/postparto)', strengthBlock(plan.strength_woman) + image(images.strengthWoman, 'Rutina suave mujer'))}

        ${section('Hidratacion', `<p style="margin:0;color:#374151;">${esc(plan.hydration)}</p>`)}
        ${section('Lista de compra', list(plan.shopping_list))}

        ${section('Aviso de seguridad', `
          <div style="background:#fee2e2;border-radius:12px;padding:16px;">
            <p style="margin:0 0 8px 0;color:#991b1b;font-size:14px;">${esc(plan.safety_note)}</p>
            <p style="margin:0;color:#991b1b;font-size:12px;">${esc(MEDICAL_DISCLAIMER)}</p>
          </div>`)}

        <tr><td style="padding:24px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Enviado automaticamente por Rutinas Bot. No respondas a este correo.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text =
    `${plan.title} - ${plan.date}\n\n` +
    `COMIDA 1: ${plan.nutrition.meal1.name}\n` +
    `COMIDA 2: ${plan.nutrition.meal2.name}\n` +
    `REFUERZO LACTANCIA: ${plan.nutrition.lactation_extra.name}\n\n` +
    `CAMINATA: ${plan.walking.goal} - ${plan.walking.instructions}\n\n` +
    `HIDRATACION: ${plan.hydration}\n\n` +
    `LISTA DE COMPRA: ${plan.shopping_list.join(', ')}\n\n` +
    `SEGURIDAD: ${plan.safety_note}\n\n${MEDICAL_DISCLAIMER}`;

  return { subject, html, text };
}
