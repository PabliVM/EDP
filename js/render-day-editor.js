// ================================================
// RENDER-DAY-EDITOR.JS
// ================================================

import { porterosState }        from './porteros-state.js';
import { getDayName, formatDate, toDateKey, getWeekKey, getMondayOfWeek } from './dates.js';
import { saveDayPlan }          from './firebase-service.js';
import { BLOCK_TYPES, DAY_TYPES, INTENSIDADES, IMPACTOS } from './porteros-constants.js';
import { showError, safeText }  from './utils.js';

let _plan = null;
let _date = null;

// ── ABRIR EDITOR COMPLETO (lápiz) ────────────────
export function openDayEditor(date, plan) {
  _date = date;
  _plan = plan ? JSON.parse(JSON.stringify(plan)) : buildEmpty(date);
  renderModal();
  document.getElementById('porteros-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// ── ABRIR EDITOR DE UN BLOQUE SOLO (click ficha) ─
export function openSingleBlockEditor(date, plan, blockIdx) {
  _date = date;
  _plan = plan ? JSON.parse(JSON.stringify(plan)) : buildEmpty(date);
  renderSingleBlockModal(blockIdx);
  document.getElementById('porteros-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// ── ABRIR EDITOR COMPLETO CON SCROLL (openBlockEditor legacy) ─
export function openBlockEditor(date, plan, blockIdx) {
  openDayEditor(date, plan);
}

function close() {
  document.getElementById('porteros-overlay').classList.add('hidden');
  document.body.style.overflow = '';
  _plan = null;
  _date = null;
}

function buildEmpty(date) {
  const monday = getMondayOfWeek(date);
  return {
    seasonKey:      porterosState.activeSeason?.seasonKey || '',
    teamKey:        porterosState.activeTeam,
    weekId:         getWeekKey(monday),
    date:           toDateKey(date),
    dayOfWeek:      date.getDay(),
    dayNumber:      date.getDate(),
    dayType:        '',
    blocks:         [],
    matchInfo:      {},
    tournamentInfo: {},
    notes:          '',
    status:         'borrador',
  };
}

// ── MODAL COMPLETO (lápiz) ────────────────────────
function renderModal() {
  const modal   = document.getElementById('porteros-modal');
  const dayType = _plan?.dayType || '';

  modal.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${getDayName(_date)}, ${formatDate(_date)}</div>
      <button class="modal-close" id="editor-close">✕</button>
    </div>
    <div class="field-group mb-12">
      <label class="label">Tipo de día</label>
      <select class="select" id="editor-day-type">
        <option value="">Sin definir</option>
        ${DAY_TYPES.map(dt =>
          `<option value="${dt.key}" ${dayType === dt.key ? 'selected' : ''}>${dt.label}</option>`
        ).join('')}
      </select>
    </div>
    <div id="editor-dynamic"></div>
    <div class="field-group mb-12">
      <label class="label">Notas</label>
      <textarea class="textarea" id="editor-notes" rows="2">${_plan?.notes || ''}</textarea>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="editor-cancel">Cancelar</button>
      <button class="btn btn-primary" id="editor-save">Guardar</button>
    </div>
  `;

  document.getElementById('editor-close').addEventListener('click', close);
  document.getElementById('editor-cancel').addEventListener('click', close);
  document.getElementById('editor-save').addEventListener('click', save);
  document.getElementById('editor-day-type').addEventListener('change', e => {
    _plan.dayType = e.target.value;
    renderDynamic();
  });
  document.getElementById('porteros-overlay').onclick = e => {
    if (e.target === document.getElementById('porteros-overlay')) close();
  };

  renderDynamic();
}

// ── MODAL BLOQUE INDIVIDUAL (click ficha) ─────────
function renderSingleBlockModal(blockIdx) {
  const modal = document.getElementById('porteros-modal');
  const block = _plan.blocks?.[blockIdx];
  if (!block) { close(); return; }

  const def   = BLOCK_TYPES.find(b => b.key === block.blockType);
  const label = def?.label || block.blockType;

  modal.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${getDayName(_date)}, ${formatDate(_date)}</div>
      <button class="modal-close" id="editor-close">✕</button>
    </div>
    <div class="card card-sm mb-12" style="border-left:3px solid var(--blue-500);">
      <div style="font-size:17px;font-weight:800;text-transform:uppercase;
        letter-spacing:0.05em;margin-bottom:14px;color:var(--text-primary);">
        ${safeText(label)}
      </div>
      <div class="field-group mb-10">
        <label class="label">Contenido</label>
        ${buildConceptSelect(blockIdx, block)}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="field-group">
          <label class="label">Intensidad</label>
          <select class="select block-field" data-idx="${blockIdx}" data-field="intensidad">
            <option value="">—</option>
            ${INTENSIDADES.map(i => `<option value="${i}" ${block.intensidad === i ? 'selected' : ''}>${i}</option>`).join('')}
          </select>
        </div>
        <div class="field-group">
          <label class="label">Impactos</label>
          <select class="select block-field" data-idx="${blockIdx}" data-field="impactos">
            <option value="">—</option>
            ${INTENSIDADES.map(i => `<option value="${i}" ${block.impactos === i ? 'selected' : ''}>${i}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="editor-cancel">Cancelar</button>
      <button class="btn btn-primary" id="editor-save">Guardar</button>
    </div>
  `;

  document.getElementById('editor-close').addEventListener('click', close);
  document.getElementById('editor-cancel').addEventListener('click', close);
  document.getElementById('editor-save').addEventListener('click', save);
  document.getElementById('porteros-overlay').onclick = e => {
    if (e.target === document.getElementById('porteros-overlay')) close();
  };

  modal.querySelectorAll('.block-field').forEach(f => {
    f.addEventListener('input',  e => { _plan.blocks[parseInt(e.target.dataset.idx)][e.target.dataset.field] = e.target.value; });
    f.addEventListener('change', e => { _plan.blocks[parseInt(e.target.dataset.idx)][e.target.dataset.field] = e.target.value; });
  });
}

function renderDynamic() {
  const section = document.getElementById('editor-dynamic');
  const dt      = _plan?.dayType || '';
  section.innerHTML = '';
  if (dt === 'entrenamiento') renderTraining(section);
  else if (dt === 'partido')  renderMatch(section);
  else if (dt === 'torneo')   renderTorneo(section);
}

function renderTraining(section) {
  section.innerHTML = `
    <div class="section-title mb-8">Bloques</div>
    <div id="blocks-list"></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
      ${BLOCK_TYPES.map(bt => `
        <button class="btn btn-ghost text-sm" data-add="${bt.key}">+ ${bt.label}</button>
      `).join('')}
    </div>
  `;
  renderBlocks();
  section.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => addBlock(btn.dataset.add));
  });
}

function renderBlocks() {
  const list   = document.getElementById('blocks-list');
  if (!list) return;
  const blocks = _plan.blocks || [];
  if (blocks.length === 0) {
    list.innerHTML = `<div class="text-muted text-sm mb-8">Sin bloques.</div>`;
    return;
  }
  list.innerHTML = '';
  blocks.forEach((block, idx) => list.appendChild(renderBlockEditor(block, idx)));
}

function renderBlockEditor(block, idx) {
  const def   = BLOCK_TYPES.find(b => b.key === block.blockType);
  const label = def?.label || block.blockType;

  const card = document.createElement('div');
  card.className = 'card card-sm mb-8';
  card.dataset.blockCard = idx;
  card.style.borderLeft = '3px solid var(--blue-500)';
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
      <span style="font-size:16px;font-weight:800;text-transform:uppercase;
        letter-spacing:0.04em;flex:1;color:var(--text-primary);">${safeText(label)}</span>
      <button class="btn btn-ghost btn-sm" data-remove="${idx}">✕</button>
    </div>
    <div class="field-group mb-8">
      <label class="label">Contenido</label>
      ${buildConceptSelect(idx, block)}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div class="field-group">
        <label class="label">Intensidad</label>
        <select class="select block-field" data-idx="${idx}" data-field="intensidad">
          <option value="">—</option>
          ${INTENSIDADES.map(i => `<option value="${i}" ${block.intensidad === i ? 'selected' : ''}>${i}</option>`).join('')}
        </select>
      </div>
      <div class="field-group">
        <label class="label">Impactos</label>
        <select class="select block-field" data-idx="${idx}" data-field="impactos">
          <option value="">—</option>
          ${INTENSIDADES.map(i => `<option value="${i}" ${block.impactos === i ? 'selected' : ''}>${i}</option>`).join('')}
        </select>
      </div>
    </div>
  `;

  card.querySelectorAll('.block-field').forEach(f => {
    f.addEventListener('input',  e => { _plan.blocks[parseInt(e.target.dataset.idx)][e.target.dataset.field] = e.target.value; });
    f.addEventListener('change', e => { _plan.blocks[parseInt(e.target.dataset.idx)][e.target.dataset.field] = e.target.value; });
  });
  card.querySelector(`[data-remove="${idx}"]`).addEventListener('click', () => {
    _plan.blocks.splice(idx, 1);
    renderBlocks();
  });

  return card;
}

function addBlock(blockType) {
  if (!_plan.blocks) _plan.blocks = [];
  _plan.blocks.push({ blockType, content: '', intensidad: '', impactos: '', status: 'borrador', orden: _plan.blocks.length });
  renderBlocks();
}

function renderMatch(section) {
  const mi = _plan.matchInfo || {};
  section.innerHTML = `
    <div class="section-title mb-8">Info partido</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
      <div class="field-group">
        <label class="label">Rival</label>
        <input type="text" class="input" id="m-rival" value="${safeText(mi.rival || '')}" />
      </div>
      <div class="field-group">
        <label class="label">Hora</label>
        <input type="time" class="input" id="m-hora" value="${safeText(mi.hora || '')}" />
      </div>
    </div>
    <div class="field-group mb-12">
      <label class="label">Local / Visitante</label>
      <select class="select" id="m-lv">
        <option value="">—</option>
        <option value="Local"     ${mi.localVisitante === 'Local'     ? 'selected' : ''}>Local</option>
        <option value="Visitante" ${mi.localVisitante === 'Visitante' ? 'selected' : ''}>Visitante</option>
      </select>
    </div>
  `;
  section.querySelectorAll('input,select').forEach(el => {
    const map = { 'm-rival': 'rival', 'm-hora': 'hora', 'm-lv': 'localVisitante' };
    el.addEventListener('input',  e => { _plan.matchInfo[map[e.target.id]] = e.target.value; });
    el.addEventListener('change', e => { _plan.matchInfo[map[e.target.id]] = e.target.value; });
  });
}

function renderTorneo(section) {
  const ti = _plan.tournamentInfo || {};
  section.innerHTML = `
    <div class="section-title mb-8">Info torneo</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
      <div class="field-group">
        <label class="label">Nombre</label>
        <input type="text" class="input" id="t-nombre" value="${safeText(ti.nombre || '')}" />
      </div>
      <div class="field-group">
        <label class="label">Lugar</label>
        <input type="text" class="input" id="t-lugar" value="${safeText(ti.lugar || '')}" />
      </div>
    </div>
  `;
  section.querySelectorAll('input').forEach(el => {
    const map = { 't-nombre': 'nombre', 't-lugar': 'lugar' };
    el.addEventListener('input', e => { _plan.tournamentInfo[map[e.target.id]] = e.target.value; });
  });
}

async function save() {
  _plan.notes  = document.getElementById('editor-notes')?.value || '';
  _plan.status = 'borrador';

  if (!porterosState.activeSeason || !porterosState.activeTeam) {
    showError('Selecciona equipo y temporada.');
    return;
  }

  const btn = document.getElementById('editor-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

  try {
    await saveDayPlan(_plan);
    close();
  } catch (err) {
    showError('Error: ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
  }
}

function buildConceptSelect(idx, block) {
  const conceptos = porterosState.conceptos || {};
  const items     = conceptos[block.blockType] || [];

  if (items.length === 0) {
    return `<textarea class="textarea block-field" data-idx="${idx}" data-field="content"
      rows="2" placeholder="Sin conceptos definidos en configuración...">${safeText(block.content || '')}</textarea>`;
  }

  return `
    <select class="select block-field" data-idx="${idx}" data-field="content">
      <option value="">— Elegir concepto —</option>
      ${items.map(item =>
        `<option value="${safeText(item)}" ${block.content === item ? 'selected' : ''}>${safeText(item)}</option>`
      ).join('')}
    </select>
  `;
}
