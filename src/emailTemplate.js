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

function section(emoji, title, inner, bgColor = '#ffffff') {
  return `
  <tr><td style="padding:20px 24px 0 24px;">
    <div style="background:${bgColor};border-radius:12px;padding:16px;">
      <h2 style="margin:0 0 12px 0;font-size:17px;color:#111827;">${emoji} ${esc(title)}</h2>
      ${inner}
    </div>
  </td></tr>`;
}

function image(url, alt) {
  if (!url) return '';
  return `<div style="margin:12px 0;"><img src="${esc(url)}" alt="${esc(alt)}" width="100%" style="max-width:100%;border-radius:10px;display:block;" /></div>`;
}

function mealCard(m, imgUrl = null, imgAlt = '') {
  return `
    <p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#111827;">${esc(m.name)}</p>
    <p style="margin:0 0 10px 0;font-size:13px;color:#059669;font-weight:600;">Proteina aprox.: ${esc(m.protein_estimate)}</p>
    ${imgUrl ? image(imgUrl, imgAlt) : ''}
    <p style="margin:0 0 2px 0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Ingredientes</p>
    ${list(m.ingredients)}
    <p style="margin:8px 0 2px 0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Preparacion</p>
    ${list(m.steps)}`;
}

function snackCard(s) {
  return `
    <p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#111827;">${esc(s.name)}</p>
    <p style="margin:0 0 10px 0;font-size:13px;color:#374151;">${esc(s.description)}</p>
    ${list(s.ingredients)}`;
}

function strengthBlock(block, imgUrl = null, imgAlt = '') {
  return `
    <p style="margin:0 0 2px 0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Calentamiento</p>
    ${list(block.warmup)}
    <p style="margin:8px 0 2px 0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Ejercicios</p>
    ${list(block.exercises)}
    ${imgUrl ? image(imgUrl, imgAlt) : ''}
    <p style="margin:8px 0 2px 0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">Vuelta a la calma</p>
    ${list(block.cooldown)}`;
}

function baseHtml(plan, headerColor, greeting, sectionsHtml) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <tr><td style="background:${headerColor};padding:28px 24px;">
          <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:800;">${esc(plan.title)}</h1>
          <p style="margin:6px 0 0 0;font-size:15px;color:rgba(255,255,255,.9);">${esc(greeting)}</p>
          <p style="margin:4px 0 0 0;font-size:13px;color:rgba(255,255,255,.65);">${esc(plan.date)}</p>
        </td></tr>

        ${sectionsHtml}

        ${section('💧', 'Hidratacion', `<p style="margin:0;color:#374151;font-size:14px;">${esc(plan.hydration)}</p>`, '#eff6ff')}
        ${section('🛒', 'Lista de compra', list(plan.shopping_list), '#f9fafb')}

        ${section('⚠️', 'Aviso de seguridad', `
          <p style="margin:0 0 8px 0;color:#991b1b;font-size:13px;">${esc(plan.safety_note)}</p>
          <p style="margin:0;color:#b91c1c;font-size:12px;line-height:1.5;">${esc(MEDICAL_DISCLAIMER)}</p>`, '#fff1f2')}

        <tr><td style="padding:20px 24px;">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">Generado automaticamente por Rutinas Bot. No respondas a este correo.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Email para el HOMBRE:
 * Desayuno con huevos OK + almuerzo compartido + merienda + fuerza masculina + caminata
 */
export function renderEmailMan(plan, images = {}) {
  const n = plan.nutrition;
  const subject = `Tu plan de hoy - ${plan.date}`;
  const sectionsHtml = `
    ${section('🍳', 'Tu desayuno', mealCard(n.breakfast_man, images.meal, 'Desayuno'), '#f9fafb')}
    ${section('🥗', 'Almuerzo', mealCard(n.lunch), '#f9fafb')}
    ${section('🍎', 'Merienda / Algo', snackCard(n.snack), '#f0fdf4')}
    ${section('🚶', 'Caminata diaria', `
      <p style="margin:0 0 4px 0;font-weight:700;color:#111827;font-size:14px;">${esc(plan.walking.goal)}</p>
      <p style="margin:0;color:#374151;font-size:14px;">${esc(plan.walking.instructions)}</p>`, '#f0f9ff')}
    ${section('💪', 'Tu rutina de fuerza', strengthBlock(plan.strength_man, images.strengthMan, 'Rutina de fuerza'), '#faf5ff')}
  `;
  const html = baseHtml(plan, '#1d4ed8', 'Aqui tienes tu plan de hoy', sectionsHtml);
  const text =
    `TU PLAN - ${plan.date}\n\n` +
    `DESAYUNO: ${n.breakfast_man.name} (${n.breakfast_man.protein_estimate})\n` +
    `ALMUERZO: ${n.lunch.name} (${n.lunch.protein_estimate})\n` +
    `MERIENDA: ${n.snack.name}\n\n` +
    `CAMINATA: ${plan.walking.goal} - ${plan.walking.instructions}\n\n` +
    `FUERZA:\n${plan.strength_man.exercises.join('\n')}\n\n` +
    `HIDRATACION: ${plan.hydration}\n\n` +
    `COMPRA: ${plan.shopping_list.join(', ')}\n\n` +
    `SEGURIDAD: ${plan.safety_note}\n\n${MEDICAL_DISCLAIMER}`;
  return { subject, html, text };
}

/**
 * Email para la MUJER:
 * Desayuno SIN huevos + almuerzo compartido + merienda + refuerzo lactancia + rutina suave + caminata
 */
export function renderEmailWoman(plan, images = {}) {
  const n = plan.nutrition;
  const subject = `Tu plan de hoy - ${plan.date}`;
  const sectionsHtml = `
    ${section('🥣', 'Tu desayuno', mealCard(n.breakfast_woman, images.meal, 'Desayuno'), '#f9fafb')}
    ${section('🥗', 'Almuerzo', mealCard(n.lunch), '#f9fafb')}
    ${section('🍎', 'Merienda / Algo', snackCard(n.snack), '#f0fdf4')}
    ${section('🤱', 'Refuerzo para lactancia', `
      <p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#111827;">${esc(n.lactation_extra.name)}</p>
      <p style="margin:0 0 10px 0;font-size:13px;color:#92400e;">${esc(n.lactation_extra.reason)}</p>
      ${list(n.lactation_extra.ingredients)}`, '#fef3c7')}
    ${section('🚶', 'Caminata diaria', `
      <p style="margin:0 0 4px 0;font-weight:700;color:#111827;font-size:14px;">${esc(plan.walking.goal)}</p>
      <p style="margin:0;color:#374151;font-size:14px;">${esc(plan.walking.instructions)}</p>`, '#f0f9ff')}
    ${section('🌸', 'Tu rutina (postparto/lactancia)', strengthBlock(plan.strength_woman, images.strengthWoman, 'Rutina suave'), '#fdf4ff')}
  `;
  const html = baseHtml(plan, '#10b981', 'Aqui tienes tu plan de hoy', sectionsHtml);
  const text =
    `TU PLAN - ${plan.date}\n\n` +
    `DESAYUNO: ${n.breakfast_woman.name} (${n.breakfast_woman.protein_estimate})\n` +
    `ALMUERZO: ${n.lunch.name} (${n.lunch.protein_estimate})\n` +
    `MERIENDA: ${n.snack.name}\n` +
    `REFUERZO LACTANCIA: ${n.lactation_extra.name} - ${n.lactation_extra.reason}\n\n` +
    `CAMINATA: ${plan.walking.goal} - ${plan.walking.instructions}\n\n` +
    `RUTINA SUAVE:\n${plan.strength_woman.exercises.join('\n')}\n\n` +
    `HIDRATACION: ${plan.hydration}\n\n` +
    `COMPRA: ${plan.shopping_list.join(', ')}\n\n` +
    `SEGURIDAD: ${plan.safety_note}\n\n${MEDICAL_DISCLAIMER}`;
  return { subject, html, text };
}
