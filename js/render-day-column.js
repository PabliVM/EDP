// ================================================
// RENDER-DAY-COLUMN.JS
// ================================================

import { getDayName, formatDate, toDateKey, getWeekKey, getMondayOfWeek } from './dates.js';
import { porterosState } from './porteros-state.js';
import { DAY_TYPES, BLOCK_TYPES } from './porteros-constants.js';
import { saveDayPlan }            from './firebase-service.js';
import { openDayEditor, openSingleBlockEditor } from './render-day-editor.js';
import { showError, safeText }    from './utils.js';

export function renderDayColumn(date, plan, isToday = false) {
  const dayType = plan?.dayType || '';
  const icons   = porterosState.icons || {};

  const col = document.createElement('div');
  col.className = 'day-col' + (isToday ? ' today' : '');
  if (dayType) col.dataset.daytype = dayType;

  col.innerHTML = `
    <div class="day-header">
      <span class="day-name">${getDayName(date).toUpperCase()}</span>
      <span class="day-number">${date.getDate()}</span>
      <span class="day-date-full">${formatDate(date)}</span>
    </div>
    <div class="day-type-row">
      <select class="day-type-select">
        <option value="">Sin definir</option>
        ${DAY_TYPES.map(dt =>
          `<option value="${dt.key}" ${dayType === dt.key ? 'selected' : ''}>${dt.label}</option>`
        ).join('')}
      </select>
    </div>
    <div class="day-body"></div>
  `;

  col.querySelector('.day-type-select').addEventListener('change', e => {
    onDayTypeChange(date, plan, e.target.value, col);
  });

  renderDayBody(col.querySelector('.day-body'), date, plan, dayType, icons);

  const editBtn = document.createElement('button');
  editBtn.className = 'edit-day-btn';
  editBtn.innerHTML = '✏️';
  editBtn.title = 'Editar día';
  editBtn.addEventListener('click', e => { e.stopPropagation(); openDayEditor(date, plan); });
  col.appendChild(editBtn);

  return col;
}

function renderDayBody(body, date, plan, dayType, icons) {
  body.innerHTML = '';

  if (!dayType || dayType === 'libre') {
    body.innerHTML = `<div class="day-empty">Sin planificación</div>`;
    return;
  }

  if (dayType === 'descanso') {
    renderSpecialDay(body, 'DESCANSO');
    if (plan?.notes) body.insertAdjacentHTML('beforeend', `<div class="day-info-compact">${safeText(plan.notes)}</div>`);
    return;
  }

  if (dayType === 'seleccion') {
    renderSpecialDay(body, 'SELECCIÓN');
    if (plan?.notes) body.insertAdjacentHTML('beforeend', `<div class="day-info-compact">${safeText(plan.notes)}</div>`);
    return;
  }

  if (dayType === 'partido') {
    renderSpecialDay(body, 'PARTIDO');
    if (plan?.matchInfo?.rival) {
      const mi = plan.matchInfo;
      body.insertAdjacentHTML('beforeend', `
        <div class="day-info-compact">
          ${mi.rival ? `<div><strong>vs</strong> ${safeText(mi.rival)}</div>` : ''}
          ${mi.hora  ? `<div>⏰ ${safeText(mi.hora)}</div>` : ''}
        </div>
      `);
    }
    appendAddBtn(body, date, plan, 'Añadir info');
    return;
  }

  if (dayType === 'torneo') {
    renderSpecialDay(body, 'TORNEO');
    appendAddBtn(body, date, plan, 'Añadir info');
    return;
  }

  if (dayType === 'entrenamiento') {
    const blocks = plan?.blocks || [];
    if (blocks.length === 0) {
      body.innerHTML = `<div class="day-empty">Sin bloques</div>`;
    } else {
      blocks.forEach(block => body.appendChild(renderBlock(block, icons, date, plan)));
    }
    appendAddBtn(body, date, plan, '＋ Añadir bloque');
  }

  // Observaciones del día
  if (plan?.notes) {
    const obs = document.createElement('div');
    obs.className = 'day-obs';
    obs.textContent = plan.notes;
    body.appendChild(obs);
  }
}

function renderSpecialDay(body, label) {
  const wrap = document.createElement('div');
  wrap.className = 'day-special';
  wrap.innerHTML = `<span class="day-special-label">${label.split('').join('<br>')}</span>`;
  body.appendChild(wrap);
}

function renderBlock(block, icons, date, plan) {
  const def     = BLOCK_TYPES.find(b => b.key === block.blockType);
  const iconSrc = icons[def?.iconKey] || '';
  const label   = def?.label || block.blockType;

  const wrap = document.createElement('div');
  wrap.className = 'training-block';
  wrap.innerHTML = `
    <div class="training-block-header">
      ${iconSrc ? `<img src="${safeText(iconSrc)}" class="training-block-icon" />` : ''}
      <span class="training-block-name">${safeText(label)}</span>
    </div>
    ${block.content ? `<div class="training-block-content">${safeText(block.content)}</div>` : ''}
    <div class="training-block-meta">
      ${block.intensidad ? `<div style="font-size:10px;font-weight:700;margin-top:2px;">INTENSIDAD: <span class="badge badge-${block.intensidad.toLowerCase()}">${block.intensidad}</span></div>` : ''}
      ${block.impactos   ? `<div style="font-size:10px;font-weight:700;margin-top:2px;">IMPACTOS: <span class="badge badge-${block.impactos.toLowerCase()}">${block.impactos}</span></div>`   : ''}
    </div>
  `;

  wrap.addEventListener('click', () => {
    if (block.blockType === 'informe_micro' || block.blockType === 'video_analisis') return;
    if (block.blockType === 'hidroterapia'  || block.blockType === 'fisioterapia')   return;
    const blockIdx = plan?.blocks?.findIndex(b =>
      b.blockType === block.blockType && b.content === block.content
    ) ?? -1;
    openSingleBlockEditor(date, plan, blockIdx);
  });

  return wrap;
}

function appendAddBtn(body, date, plan, label) {
  const btn = document.createElement('button');
  btn.className = 'add-block-btn';
  btn.innerHTML = label;
  btn.addEventListener('click', () => openDayEditor(date, plan));
  body.appendChild(btn);
}

async function onDayTypeChange(date, plan, newType, col) {
  if (!porterosState.activeSeason || !porterosState.activeTeam) {
    showError('Selecciona equipo y temporada.');
    return;
  }
  const monday = getMondayOfWeek(date);
  const weekId = getWeekKey(monday);

  try {
    await saveDayPlan({
      ...(plan || {}),
      seasonKey: porterosState.activeSeason.seasonKey,
      teamKey:   porterosState.activeTeam,
      weekId,
      date:      toDateKey(date),
      dayOfWeek: date.getDay(),
      dayNumber: date.getDate(),
      dayType:   newType,
      blocks:    newType === 'entrenamiento' ? (plan?.blocks || []) : [],
    });
    col.dataset.daytype = newType;
  } catch (err) {
    showError('Error guardando: ' + err.message);
  }
}
