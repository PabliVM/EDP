// ================================================
// RENDER-PRINT-WEEK.JS — Impresión semanal limpia
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

  // Recoger planes actuales del DOM no es fiable — los leemos del estado global
  // que firebase-service mantiene vía onSnapshot en render-week-planning
  const plans = _getCurrentPlans(days);

  const html = buildPrintHTML({ days, plans, season, team, microN, monday, icons });

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

// ── Recoger planes del DOM de forma segura ──────
function _getCurrentPlans(days) {
  const byDate = {};
  days.forEach(date => {
    const key = toDateKey(date);
    const col = document.querySelector(`.day-col[data-date-key="${key}"]`) ||
                document.querySelector(`[data-datekey="${key}"]`);
    // Los datos reales viven en Firebase — los leemos del estado en memoria
    // que render-week-planning.js actualiza con onSnapshot
    byDate[key] = window.__edpWeekPlans?.[key] || null;
  });
  return byDate;
}

// ── Construcción HTML limpio ─────────────────────
function buildPrintHTML({ days, plans, season, team, microN, monday, icons }) {
  const weekLabel = formatWeekRange(monday);

  const daysHTML = days.map(date => {
    const key  = toDateKey(date);
    const plan = plans[key];
    return buildDayHTML(date, plan, icons);
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Planificación EDP — ${team} — ${weekLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; font-size: 11px; color: #111; background: #fff; }

    .print-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      border-bottom: 2px solid #c9a227;
      margin-bottom: 12px;
    }
    .print-header img { width: 44px; height: 44px; object-fit: contain; }
    .print-header-title { font-size: 16px; font-weight: 800; }
    .print-header-sub   { font-size: 11px; color: #555; margin-top: 2px; }
    .print-header-meta  { margin-left: auto; text-align: right; font-size: 11px; color: #333; line-height: 1.6; }

    .print-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
      padding: 0 8px;
    }

    .print-day {
      border: 1px solid #d1d9e6;
      border-radius: 6px;
      overflow: hidden;
      min-height: 200px;
      display: flex;
      flex-direction: column;
    }
    .print-day-header {
      background: #f0f4fa;
      padding: 5px 7px;
      border-bottom: 1px solid #d1d9e6;
    }
    .print-day-name   { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; color: #666; text-transform: uppercase; }
    .print-day-number { font-size: 20px; font-weight: 800; line-height: 1; color: #111; }
    .print-day-date   { font-size: 9px; color: #888; }

    .print-day-content {
      flex: 1;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .print-block {
      border: 1px solid #e8eef8;
      border-radius: 4px;
      padding: 5px 6px;
      border-left: 2px solid #2563eb;
    }
    .print-block-header {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 3px;
    }
    .print-block-icon { width: 16px; height: 16px; object-fit: contain; }
    .print-block-name { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; }
    .print-block-content { font-size: 9px; color: #444; margin-top: 2px; }
    .print-block-meta { font-size: 9px; color: #666; margin-top: 2px; }

    .print-vertical {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 0;
    }
    .print-vertical-word {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      text-align: center;
      line-height: 1.3;
    }
    .print-vertical-word.partido  { color: #c9a227; }
    .print-vertical-word.descanso { color: #9ca3af; }
    .print-vertical-word.torneo   { color: #a78bfa; }

    .print-match-info { font-size: 9px; color: #333; padding: 4px 6px; line-height: 1.6; }

    .print-empty { font-size: 9px; color: #bbb; text-align: center; padding: 12px 4px; }

    @media print {
      body { font-size: 10px; }
      .print-grid { gap: 4px; padding: 0 4px; }
      .print-day  { min-height: 160px; }
    }
  </style>
</head>
<body>

  <div class="print-header">
    <img src="${icons.logo || './rm.png'}" alt="RM" />
    <div>
      <div class="print-header-title">Coordinación EDP</div>
      <div class="print-header-sub">Planificación semanal de porteros</div>
    </div>
    <div class="print-header-meta">
      <div><strong>Equipo:</strong> ${safeText(team)}</div>
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
  const dateStr = `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
  const dayType = plan?.dayType || '';

  return `
    <div class="print-day">
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
          ${mi.rival ? `<div><strong>vs</strong> ${safeText(mi.rival)}</div>` : ''}
          ${mi.localVisitante ? `<div>${safeText(mi.localVisitante)}</div>` : ''}
          ${mi.hora ? `<div>⏰ ${safeText(mi.hora)}</div>` : ''}
          ${mi.competicion ? `<div>${safeText(mi.competicion)}</div>` : ''}
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

  return `
    <div class="print-block">
      <div class="print-block-header">
        ${iconSrc ? `<img src="${safeText(iconSrc)}" class="print-block-icon" />` : ''}
        <span class="print-block-name">${safeText(label)}</span>
      </div>
      ${block.content ? `<div class="print-block-content">${safeText(block.content)}</div>` : ''}
      ${isCampo && (block.intensidad || block.impactos) ? `
        <div class="print-block-meta">
          ${block.intensidad ? `INTENSIDAD: <strong>${safeText(block.intensidad)}</strong>` : ''}
          ${block.intensidad && block.impactos ? ' · ' : ''}
          ${block.impactos   ? `IMPACTOS: <strong>${safeText(block.impactos)}</strong>`   : ''}
        </div>
      ` : ''}
    </div>
  `;
}
