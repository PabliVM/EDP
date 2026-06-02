// ================================================
// RENDER-PRINT-WEEK.JS — Impresión semanal
// ================================================

import { porterosState }                       from './porteros-state.js';
import { BLOCK_TYPES, PORTEROS_TEAMS, PORTERO_TEAM } from './porteros-constants.js';
import { getWeekDays, formatWeekRange, getMicroNumber, toDateKey, getDayName, addWeeks } from './dates.js';
import { safeText }                            from './utils.js';
import { listenWeekPlans }                     from './firebase-service.js';

export async function printWeek(numWeeks = 1) {
  const monday  = porterosState.currentMonday;
  const season  = porterosState.activeSeason;
  const team    = porterosState.activeTeam;
  const icons   = porterosState.icons || {};

  if (!monday || !season || !team) {
    alert('Selecciona equipo y temporada antes de imprimir.');
    return;
  }

  const isPortero = team === PORTERO_TEAM.key;
  const teamFull  = isPortero
    ? (window.__edpPorteroName || 'Portero')
    : (PORTEROS_TEAMS.find(t => t.key === team)?.full || team);
  const photoURL  = isPortero ? (window.__edpPorteroPhotoURL || null) : null;

  const loadingEl = document.createElement('div');
  loadingEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;font-weight:700;font-family:Segoe UI,sans-serif;';
  loadingEl.textContent = `Cargando ${numWeeks} semana(s)...`;
  document.body.appendChild(loadingEl);

  try {
    const sheetsData = [];

    for (let i = 0; i < numWeeks; i++) {
      const weekMonday = addWeeks(monday, i);
      const weekId     = getWeekKey(weekMonday);
      const weekLabel  = formatWeekRange(weekMonday);
      const microN     = getMicroNumber(weekMonday, season.startDate);
      const plans      = i === 0 && numWeeks === 1
        ? (window.__edpWeekPlans || {})
        : await loadTeamPlans(season.seasonKey, team, weekId, getWeekDays(weekMonday));

      sheetsData.push({ teamFull, plans, photoURL, weekLabel, microN, monday: weekMonday });
    }

    const html = buildHTMLWrapper(
      sheetsData.map(s => buildSheetHTML({ ...s, season, icons, logoSrc: icons.logo || './rm.png' })).join(''),
      icons.logo || './rm.png',
      sheetsData[0]?.weekLabel || ''
    );
    openPrint(html);
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    document.body.removeChild(loadingEl);
  }
}

export async function printAllWeeks() {
  const monday  = porterosState.currentMonday;
  const season  = porterosState.activeSeason;
  const icons   = porterosState.icons || {};

  if (!monday || !season) {
    alert('Selecciona una temporada activa antes de imprimir.');
    return;
  }

  const days      = getWeekDays(monday);
  const microN    = getMicroNumber(monday, season.startDate);
  const weekLabel = formatWeekRange(monday);
  const weekId    = getWeekKey(monday);
  const logoSrc   = icons.logo || './rm.png';

  const loadingEl = document.createElement('div');
  loadingEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;font-weight:700;font-family:Segoe UI,sans-serif;';
  loadingEl.textContent = 'Cargando planificaciones...';
  document.body.appendChild(loadingEl);

  try {
    const teamsData = await Promise.all(
      PORTEROS_TEAMS.map(team => loadTeamPlans(season.seasonKey, team.key, weekId, days))
    );

    const sheetsData = PORTEROS_TEAMS.map((team, i) => ({
      teamFull: team.full,
      plans:    teamsData[i],
      photoURL: null,
      weekLabel,
      microN,
      monday,
    }));

    if (window.__edpPorteroName) {
      const porteroPlans = await loadTeamPlans(season.seasonKey, PORTERO_TEAM.key, weekId, days);
      sheetsData.push({
        teamFull: window.__edpPorteroName || 'Portero',
        plans:    porteroPlans,
        photoURL: window.__edpPorteroPhotoURL || null,
        weekLabel,
        microN,
        monday,
      });
    }

    const coverHTML  = buildCover({ weekLabel, season, logoSrc });
    const sheetsHTML = sheetsData.map(s =>
      buildSheetHTML({ ...s, season, icons, logoSrc })
    ).join('');

    openPrint(buildHTMLWrapper(coverHTML + sheetsHTML, logoSrc, weekLabel));
  } catch (err) {
    alert('Error cargando planificaciones: ' + err.message);
  } finally {
    document.body.removeChild(loadingEl);
  }
}

function loadTeamPlans(seasonKey, teamKey, weekId, days) {
  return new Promise((resolve, reject) => {
    const unsub = listenWeekPlans(seasonKey, teamKey, weekId,
      plans => {
        unsub();
        const byDate = {};
        plans.forEach(p => { byDate[p.date] = p; });
        resolve(byDate);
      },
      err => { unsub(); reject(err); }
    );
    setTimeout(() => { try { unsub(); } catch(_){} resolve({}); }, 5000);
  });
}

function getWeekKey(monday) {
  const y  = monday.getFullYear();
  const d  = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const wn = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${y}-W${wn.toString().padStart(2, '0')}`;
}

function openPrint(html) {
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 600);
}

function buildHTMLWrapper(contentHTML, logoSrc, title) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Microciclo - Departamento GK — ${safeText(title)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: 'Segoe UI', sans-serif; font-size: 10px; color: #111; background: #fff; }

    .page-break { page-break-after: always; break-after: page; height: 0; }

    /* ── PORTADA ── */
    .cover {
      background: #1d4ed8 !important;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
      width: 100%; height: 190mm;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 24px;
    }
    .cover-logo {
      width: 100px; height: 100px; border-radius: 50%;
      background: rgba(255,255,255,0.95) !important;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; border: 3px solid #93c5fd;
    }
    .cover-logo img { width: 84px; height: 84px; object-fit: contain; }
    .cover-title  { font-size: 42px; font-weight: 900; color: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; letter-spacing: 0.05em; text-align: center; }
    .cover-sub    { font-size: 20px; font-weight: 600; color: #bfdbfe !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; letter-spacing: 0.08em; text-align: center; }
    .cover-week   { font-size: 26px; font-weight: 800; color: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: rgba(255,255,255,0.12) !important; padding: 12px 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.3); text-align: center; }
    .cover-season { font-size: 16px; font-weight: 600; color: #93c5fd !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; text-align: center; }

    /* ── HEADER HOJA ── */
    .print-header {
      background: #1d4ed8 !important;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
      border-bottom: 3px solid #93c5fd;
      padding: 10px 16px;
      display: flex; align-items: center; gap: 16px;
      margin-bottom: 10px; position: relative;
    }
    .print-header-logo {
      width: 48px; height: 48px; border-radius: 50%;
      background: rgba(255,255,255,0.9) !important;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
      border: 1.5px solid #93c5fd;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; flex-shrink: 0;
    }
    .print-header-logo img { width: 40px; height: 40px; object-fit: contain; }
    .print-header-text  { flex: 1; }
    .print-header-title { font-size: 14px; font-weight: 800; color: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; letter-spacing: 0.03em; }
    .print-header-sub   { font-size: 10px; color: #bfdbfe !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin-top: 2px; letter-spacing: 0.05em; }
    .print-header-week  { font-size: 11px; color: #bfdbfe !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin-top: 3px; }
    .print-header-team  { font-size: 28px; font-weight: 900; color: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; position: absolute; left: 50%; transform: translateX(-50%); }

    .print-portero-photo { width: 52px; height: 52px; border-radius: 50%; border: 2px solid #93c5fd; overflow: hidden; flex-shrink: 0; margin-left: auto; }
    .print-portero-photo img { width: 100%; height: 100%; object-fit: cover; }

    /* ── GRID ── */
    .print-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }

    .print-day { border: 1px solid #d1d9e6; border-radius: 6px; overflow: hidden; min-height: 160px; display: flex; flex-direction: column; background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-day-entrenamiento { border-top: 2px solid #2563eb; }
    .print-day-partido       { border-top: 2px solid #c9a227; }
    .print-day-descanso      { border-top: 2px solid #d1d9e6; }
    .print-day-torneo        { border-top: 2px solid #a78bfa; }
    .print-day-seleccion     { border-top: 2px solid #10b981; }

    .print-day-header { background: #f0f4fa !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 4px 6px; border-bottom: 1px solid #d1d9e6; }
    .print-day-name   { font-size: 8px; font-weight: 700; letter-spacing: 0.1em; color: #666; text-transform: uppercase; }
    .print-day-number { font-size: 20px; font-weight: 800; line-height: 1; color: #111; }
    .print-day-date   { font-size: 8px; color: #888; }
    .print-day-content { flex: 1; padding: 5px; display: flex; flex-direction: column; gap: 4px; }

    .print-block { border: 1px solid #e8eef8; border-left: 2px solid #2563eb; border-radius: 4px; padding: 4px 5px; }
    .print-block-header { display: flex; align-items: center; gap: 5px; margin-bottom: 2px; }
    .print-block-icon    { width: 16px; height: 16px; object-fit: contain; }
    .print-block-name    { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #0f1117; }
    .print-block-content { font-size: 8px; color: #333; margin-top: 2px; line-height: 1.4; }
    .print-block-meta    { font-size: 8px; margin-top: 2px; line-height: 1.6; }
    .meta-alta  { color: #ef4444 !important; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .meta-media { color: #f59e0b !important; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .meta-baja  { color: #22c55e !important; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    .print-vertical { flex: 1; display: flex; align-items: center; justify-content: center; padding: 6px 0; }
    .print-vertical-word { font-size: 18px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; text-align: center; line-height: 1.3; }
    .partido  { color: #c9a227 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .descanso { color: #9ca3af !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .torneo   { color: #a78bfa !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .viaje    { color: #6ee7b7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .seleccion { color: #10b981 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    .print-match-info { font-size: 8px; color: #333; padding: 3px 5px; line-height: 1.6; }
    .print-empty { font-size: 9px; color: #bbb; text-align: center; padding: 10px 4px; flex: 1; display: flex; align-items: center; justify-content: center; }
  </style>
</head>
<body>
  ${contentHTML}
</body>
</html>`;
}

function buildCover({ weekLabel, season, logoSrc }) {
  const [start, end] = weekLabel.split(' — ');
  const year      = end?.split('/')?.pop() || '';
  const startFull = start && year ? `${start}/${year}` : start;
  const endFull   = end || '';

  return `
    <div class="cover">
      <div class="cover-logo"><img src="${logoSrc}" alt="RM" /></div>
      <div class="cover-title">Microciclo - Departamento GK</div>
      <div class="cover-sub">Planificación semanal de porteros</div>
      <div class="cover-week">📅 ${safeText(startFull)} - ${safeText(endFull)}</div>
      <div class="cover-season">${safeText(season.name || season.seasonKey)}</div>
    </div>
    <div class="page-break"></div>
  `;
}

function buildSheetHTML({ teamFull, plans, photoURL, season, microN, monday, icons, weekLabel, logoSrc }) {
  const days     = getWeekDays(monday);
  const daysHTML = days.map(date => {
    const key  = toDateKey(date);
    const plan = plans[key] || null;
    return buildDayHTML(date, plan, icons);
  }).join('');

  const [start, end] = weekLabel.split(' — ');
  const year      = end?.split('/')?.pop() || '';
  const startFull = start && year ? `${start}/${year}` : start;

  const photoHTML = photoURL ? `
    <div class="print-portero-photo">
      <img src="${safeText(photoURL)}" alt="Portero" />
    </div>
  ` : '';

  return `
    <div>
      <div class="print-header">
        <div class="print-header-logo"><img src="${logoSrc}" alt="RM" /></div>
        <div class="print-header-text">
          <div class="print-header-title">Microciclo - Departamento GK</div>
          <div class="print-header-sub">Planificación semanal de porteros</div>
          <div class="print-header-week">📅 ${safeText(startFull)} - ${safeText(end || '')} &nbsp;·&nbsp; Microciclo ${microN}</div>
        </div>
        <div class="print-header-team">${safeText(teamFull)}</div>
        ${photoHTML}
      </div>
      <div class="print-grid">${daysHTML}</div>
    </div>
    <div class="page-break"></div>
  `;
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
      <div class="print-day-content">${buildDayContent(dayType, plan, icons)}</div>
    </div>
  `;
}

function buildDayContent(dayType, plan, icons) {
  if (!dayType || dayType === 'libre') return `<div class="print-empty">Sin planificación</div>`;
  if (dayType === 'descanso')  return `<div class="print-vertical"><span class="print-vertical-word descanso">${'DESCANSO'.split('').join('<br>')}</span></div>`;
  if (dayType === 'seleccion') return `<div class="print-vertical"><span class="print-vertical-word seleccion">${'SELECCIÓN'.split('').join('<br>')}</span></div>`;
  if (dayType === 'viaje')     return `<div class="print-vertical"><span class="print-vertical-word viaje">${'VIAJE'.split('').join('<br>')}</span></div>`;
  if (dayType === 'partido') {
    const mi = plan?.matchInfo || {};
    return `
      <div class="print-vertical"><span class="print-vertical-word partido">${'PARTIDO'.split('').join('<br>')}</span></div>
      ${mi.rival || mi.hora ? `<div class="print-match-info">
        ${mi.rival          ? `<div><strong>vs</strong> ${safeText(mi.rival)}</div>` : ''}
        ${mi.localVisitante ? `<div>${safeText(mi.localVisitante)}</div>`            : ''}
        ${mi.hora           ? `<div>⏰ ${safeText(mi.hora)}</div>`                  : ''}
        ${mi.competicion    ? `<div>${safeText(mi.competicion)}</div>`               : ''}
      </div>` : ''}
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
          ${block.intensidad ? `<div>INTENSIDAD: <span class="${intensidadClass}">${safeText(block.intensidad)}</span></div>` : ''}
          ${block.impactos   ? `<div>IMPACTOS: <span class="${impactosClass}">${safeText(block.impactos)}</span></div>`       : ''}
        </div>
      ` : ''}
    </div>
  `;
}


