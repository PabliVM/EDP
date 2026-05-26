// ================================================
// RENDER-PRINT-WEEK.JS — Impresión semanal
// ================================================

import { porterosState }           from './porteros-state.js';
import { BLOCK_TYPES }             from './porteros-constants.js';
import { getWeekDays, formatWeekRange, getMicroNumber, toDateKey, getDayName } from './dates.js';
import { safeText }                from './utils.js';

export function printWeek() {
  const monday  = porterosState.currentMonday;
  const season  = porterosState.activeSeason;
  const team    = porterosState.activeTeam;
  const icons   = porterosState.icons || {};

  if (!monday || !season || !team) {
    alert('Selecciona equipo y temporada antes de imprimir.');
    return;
  }

  const days   = getWeekDays(monday);
  const microN = getMicroNumber(monday, season.startDate);
  const plans  = window.__edpWeekPlans || {};

  const html = buildPrintHTML({ days, plans, season, team, microN, monday, icons });

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
}

function buildPrintHTML({ days, plans, season, team, microN, monday, icons }) {
  const weekLabel = formatWeekRange(monday);
  const logoSrc   = icons.logo || './rm.png';

  const daysHTML = days.map(date => {
    const key  = toDateKey(date);
    const plan = plans[key] || null;
    return buildDayHTML(date, plan, icons);
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Planificación EDP — ${safeText(team)} — ${safeText(weekLabel)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: 'Segoe UI', sans-serif;
      font-size: 10px;
      color: #111;
      background: #fff;
    }

    /* HEADER */
    .print-header {
      background: #0d1117 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      border-bottom: 3px solid #c9a227;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 10px;
    }
    .print-header-logo {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(255,255,255,0.9) !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      border: 1.5px solid #9b7c1a;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    .print-header-logo img {
      width: 36px;
      height: 36px;
      object-fit: contain;
    }
    .print-header-text { flex: 1; }
    .print-header-title {
      font-size: 14px;
      font-weight: 800;
      color: #ffffff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      letter-spacing: 0.03em;
    }
    .print-header-sub {
      font-size: 10px;
      color: #c9a227 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      margin-top: 2px;
      letter-spacing: 0.05em;
    }
    .print-header-team {
      font-size: 26px;
      font-weight: 900;
      color: #ffffff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      letter-spacing: 0.06em;
      text-align: center;
      flex: 1;
    }
    .print-header-meta {
      text-align: right;
      color: #e6edf3 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-size: 10px;
      line-height: 1.8;
    }
    .print-header-meta strong {
      color: #c9a227 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* GRID */
    .print-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 5px;
    }

    /* DÍA */
    .print-day {
      border: 1px solid #d1d9e6;
      border-radius: 6px;
      overflow: hidden;
      min-height: 180px;
      display: flex;
      flex-direction: column;
      background: #fff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-day-entrenamiento { border-top: 2px solid #2563eb; }
    .print-day-partido       { border-top: 2px solid #c9a227; }
    .print-day-descanso      { border-top: 2px solid #d1d9e6; }
    .print-day-torneo        { border-top: 2px solid #a78bfa; }

    .print-day-header {
      background: #f0f4fa !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      padding: 4px 6px;
      border-bottom: 1px solid #d1d9e6;
    }
    .print-day-name   { font-size: 8px; font-weight: 700; letter-spacing: 0.1em; color: #666; text-transform: uppercase; }
    .print-day-number { font-size: 22px; font-weight: 800; line-height: 1; color: #111; }
    .print-day-date   { font-size: 8px; color: #888; }

    .print-day-content {
      flex: 1;
      padding: 5px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    /* BLOQUES */
    .print-block {
      border: 1px solid #e8eef8;
      border-left: 2px solid #2563eb;
      border-radius: 4px;
      padding: 4px 5px;
    }
    .print-block-header {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 2px;
    }
    .print-block-icon    { width: 18px; height: 18px; object-fit: contain; }
    .print-block-name    { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #0f1117; }
    .print-block-content { font-size: 8px; color: #333; margin-top: 2px; line-height: 1.4; }
    .print-block-meta    { font-size: 8px; margin-top: 2px; line-height: 1.5; }
    .meta-alta  { color: #ef4444 !important; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .meta-media { color: #f59e0b !important; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .meta-baja  { color: #22c55e !important; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    /* VERTICAL */
    .print-vertical {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px 0;
    }
    .print-vertical-word {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      text-align: center;
      line-height: 1.3;
    }
    .partido  { color: #c9a227 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .descanso { color: #9ca3af !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .torneo   { color: #a78bfa !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .viaje    { color: #6ee7b7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    .print-match-info {
      font-size: 8px;
      color: #333;
      padding: 3px 5px;
      line-height: 1.6;
    }

    .print-empty {
      font-size: 9px;
      color: #bbb;
      text-align: center;
      padding: 10px 4px;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>

  <div class="print-header">
    <div class="print-header-logo">
      <img src="${logoSrc}" alt="RM" />
    </div>
    <div class="print-header-text">
      <div class="print-header-title">Coordinación EDP</div>
      <div class="print-header-sub">Planificación semanal de porteros</div>
    </div>
    <div class="print-header-team">${safeText(team)}</div>
    <div class="print-header-meta">
      <div><strong>Semana:</strong> ${safeText(weekLabel)}</div>
      <div><strong>Microciclo:</strong> ${microN}</div>
      <div><strong>Temporada:</strong> ${safeText(season.name || season.seasonKey)}</div>
    </div>
  </div>

  <div class="print-grid">
    ${daysHTML}
  </div>

</body>
</html>`;
}

function buildDayHTML(date, plan, icons) {
  const dayName = getDayName(date).toUpperCase();
  const dayNum  = date.getDate();
  const mo      = String(date.getMonth() + 1).padStart(2, '0');
  const dd      = String(date.getDate()).padStart(2, '0');
  const yyyy    = date.getFullYear();
  const dateStr = `${dd}/${mo}/${yyyy}`;
  const dayType = plan?.dayType || '';

  return `
    <div class="print-day print-day-${dayType || 'libre'}">
      <div class="print-day-header">
        <div class="print-day-name">${dayName}</div>
        <div class="print-day-number">${dayNum}</div>
        <div class="print-day-date">${dateStr}</div>
      </div>
      <div class="print-day-content">
        ${buildDayContent(dayType, plan, icons)}
      </div>
    </div>
  `;
}

function buildDayContent(dayType, plan, icons) {
  if (!dayType || dayType === 'libre') {
    return `<div class="print-empty">Sin planificación</div>`;
  }
  if (dayType === 'descanso') {
    return `<div class="print-vertical"><span class="print-vertical-word descanso">${'DESCANSO'.split('').join('<br>')}</span></div>`;
  }
  if (dayType === 'partido') {
    const mi = plan?.matchInfo || {};
    return `
      <div class="print-vertical"><span class="print-vertical-word partido">${'PARTIDO'.split('').join('<br>')}</span></div>
      ${mi.rival || mi.hora ? `
        <div class="print-match-info">
          ${mi.rival          ? `<div><strong>vs</strong> ${safeText(mi.rival)}</div>` : ''}
          ${mi.localVisitante ? `<div>${safeText(mi.localVisitante)}</div>`            : ''}
          ${mi.hora           ? `<div>⏰ ${safeText(mi.hora)}</div>`                  : ''}
          ${mi.competicion    ? `<div>${safeText(mi.competicion)}</div>`               : ''}
        </div>
      ` : ''}
    `;
  }
  if (dayType === 'torneo') {
    const ti = plan?.tournamentInfo || {};
    return `
      <div class="print-vertical"><span class="print-vertical-word torneo">${'TORNEO'.split('').join('<br>')}</span></div>
      ${ti.nombre ? `<div class="print-match-info"><div><strong>${safeText(ti.nombre)}</strong></div>${ti.lugar ? `<div>📍 ${safeText(ti.lugar)}</div>` : ''}</div>` : ''}
    `;
  }
  if (dayType === 'viaje') {
    return `<div class="print-vertical"><span class="print-vertical-word viaje">${'VIAJE'.split('').join('<br>')}</span></div>`;
  }
  if (dayType === 'entrenamiento') {
    const blocks = plan?.blocks || [];
    if (blocks.length === 0) return `<div class="print-empty">Sin bloques</div>`;
    return blocks.map(block => buildBlockHTML(block, icons)).join('');
  }
  return `<div class="print-empty">Sin planificación</div>`;
}

function buildBlockHTML(block, icons) {
  const def     = BLOCK_TYPES.find(b => b.key === block.blockType);
  const label   = def?.label || block.blockType;
  const iconSrc = icons[def?.iconKey] || '';
  const isCampo = block.blockType === 'entrenamiento_campo';

  const intensidadClass = block.intensidad ? `meta-${block.intensidad.toLowerCase()}` : '';
  const impactosClass   = block.impactos   ? `meta-${block.impactos.toLowerCase()}`   : '';

  return `
    <div class="print-block">
      <div class="print-block-header">
        ${iconSrc ? `<img src="${safeText(iconSrc)}" class="print-block-icon" />` : ''}
        <span class="print-block-name">${safeText(label)}</span>
      </div>
      ${block.content ? `<div class="print-block-content">${safeText(block.content)}</div>` : ''}
      ${isCampo && (block.intensidad || block.impactos) ? `
        <div class="print-block-meta">
          ${block.intensidad ? `INTENSIDAD: <span class="${intensidadClass}">${safeText(block.intensidad)}</span>` : ''}
          ${block.intensidad && block.impactos ? ' · ' : ''}
          ${block.impactos   ? `IMPACTOS: <span class="${impactosClass}">${safeText(block.impactos)}</span>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}
