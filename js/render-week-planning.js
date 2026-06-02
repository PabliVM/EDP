// ================================================
// RENDER-WEEK-PLANNING.JS
// ================================================
import { printWeek, printAllWeeks }    from './render-print-week.js';
import { porterosState, setPorterosState } from './porteros-state.js';
import { PORTERO_TEAM }                from './porteros-constants.js';
import {
  getMondayOfWeek, getWeekDays, addWeeks,
  formatWeekRange, getWeekKey, getMicroNumber,
  getMicroNumberForTeam, toDateKey, isSameDay,
} from './dates.js';
import {
  listenWeekPlans, upsertWeek,
  saveWeekMicro, getWeekMicro,
  savePorteroSlot, getPorteroSlots,
  uploadPorteroSlotPhoto,
} from './firebase-service.js';
import { renderDayColumn } from './render-day-column.js';
import { showError }       from './utils.js';

const PORTERO_SLOTS = ['P1', 'P2', 'P3', 'P4'];

let _unsubPlans    = [];
let _microOverride = null;
let _porteroSlots  = { P1: { name: '', photo: null }, P2: { name: '', photo: null }, P3: { name: '', photo: null }, P4: { name: '', photo: null } };
let _activeSlot    = 'P1';
window.__edpWeekPlans = {};
window.__edpPorteroSlots = _porteroSlots;

export function renderWeekPlanning() {
  const panel = document.getElementById('view-semana');
  if (!panel) return;
  panel.innerHTML = '';

  // Cancelar suscripciones anteriores
  _unsubPlans.forEach(u => { try { u(); } catch(_){} });
  _unsubPlans = [];

  if (!porterosState.activeTeam) {
    panel.innerHTML = `<div class="state-empty"><div class="state-empty-icon">👆</div><p>Selecciona un equipo.</p></div>`;
    return;
  }
  if (!porterosState.activeSeason) {
    panel.innerHTML = `<div class="state-empty"><div class="state-empty-icon">📅</div><p>No hay temporada activa.<br>Crea una en <strong>Configuración</strong>.</p></div>`;
    return;
  }

  const isPortero = porterosState.activeTeam === PORTERO_TEAM.key;
  const monday    = porterosState.currentMonday;
  const days      = getWeekDays(monday);
  const weekId    = getWeekKey(monday);
  const season    = porterosState.activeSeason;

  const microBase = getMicroNumberForTeam(monday, porterosState.activeTeam, porterosState.microciclos);

  _microOverride = null;
  getWeekMicro(season.seasonKey, porterosState.activeTeam, weekId)
    .then(saved => { _microOverride = saved; _updateMicroInput(); })
    .catch(() => {});

  upsertWeek({
    id:          weekId,
    seasonKey:   season.seasonKey,
    weekNumber:  parseInt(weekId.split('-W')[1]),
    microNumber: microBase,
    mondayDate:  toDateKey(monday),
    sundayDate:  toDateKey(days[6]),
    label:       formatWeekRange(monday),
  }).catch(err => showError('Error guardando semana: ' + err.message));

  _renderNav(panel, monday, days, weekId, microBase, season, isPortero);
}

function _updateMicroInput() {
  const input = document.getElementById('micro-input');
  if (input && _microOverride !== null) input.value = _microOverride;
}

function _renderNav(panel, monday, days, weekId, microBase, season, isPortero) {
  const microN = _microOverride ?? microBase;

  const nav = document.createElement('div');
  nav.className = 'week-nav no-print';
  nav.innerHTML = `
    <button class="btn btn-ghost btn-icon" id="btn-prev-week">◀</button>
    <div class="week-nav-info">
      <div class="week-nav-label">${formatWeekRange(monday)}</div>
      <div class="week-nav-sub" style="display:flex;align-items:center;gap:6px;justify-content:center;">
        <span>Microciclo</span>
        <input type="number" id="micro-input" value="${microN}" min="1" max="99"
          style="width:48px;text-align:center;font-size:11px;font-weight:700;
            border:1px solid var(--border-default);border-radius:4px;
            padding:1px 4px;background:var(--bg-raised);color:var(--text-primary);" />
        <button id="btn-save-micro" class="btn btn-ghost btn-sm" style="font-size:10px;padding:2px 6px;">✓</button>
        <span>·</span>
        <span>${season.name || season.seasonKey}</span>
      </div>
    </div>
    <button class="btn btn-ghost" id="btn-today-week">Hoy</button>
    <button class="btn btn-ghost btn-icon" id="btn-next-week">▶</button>
    <button class="btn btn-ghost no-print" id="btn-print-week" title="Imprimir este equipo">🖨️</button>
    <button class="btn btn-ghost no-print" id="btn-print-all" title="Imprimir todos los equipos">🖨️ Todos</button>
  `;
  panel.appendChild(nav);

  document.getElementById('btn-prev-week').addEventListener('click',  () => navigate(-1));
  document.getElementById('btn-next-week').addEventListener('click',  () => navigate(1));
  document.getElementById('btn-today-week').addEventListener('click', () => goToday());
  document.getElementById('btn-print-week').addEventListener('click', () => printWeek());
  document.getElementById('btn-print-all').addEventListener('click',  () => printAllWeeks());
  document.getElementById('btn-save-micro').addEventListener('click', async () => {
    const val = parseInt(document.getElementById('micro-input')?.value);
    if (isNaN(val) || val < 1) return;
    try {
      await saveWeekMicro(season.seasonKey, porterosState.activeTeam, weekId, val);
      _microOverride = val;
    } catch (err) { showError('Error guardando microciclo: ' + err.message); }
  });

  if (isPortero) {
    _renderPorteroView(panel, monday, days, weekId, season);
  } else {
    _renderGrid(panel, monday, days, weekId, season, porterosState.activeTeam);
  }
}

// ── VISTA PORTERO ─────────────────────────────────

function _renderPorteroView(panel, monday, days, weekId, season) {
  // Reset slots en memoria
  _porteroSlots = { P1: { name: '', photo: null }, P2: { name: '', photo: null }, P3: { name: '', photo: null }, P4: { name: '', photo: null } };
  _activeSlot   = 'P1';
  window.__edpPorteroSlots = _porteroSlots;

  // Cargar slots desde Firebase
  getPorteroSlots(season.seasonKey, weekId).then(slots => {
    if (slots) {
      PORTERO_SLOTS.forEach(s => {
        if (slots[s]) _porteroSlots[s] = { ...slots[s] };
      });
      window.__edpPorteroSlots = _porteroSlots;
    }
    _renderPorteroTabs(panel, monday, days, weekId, season);
  }).catch(() => {
    _renderPorteroTabs(panel, monday, days, weekId, season);
  });
}

function _renderPorteroTabs(panel, monday, days, weekId, season) {
  // Quitar tabs anteriores
  const old = panel.querySelector('#portero-tabs-wrap');
  if (old) old.remove();
  const oldGrid = panel.querySelector('#portero-grid-wrap');
  if (oldGrid) oldGrid.remove();

  // Tabs de slots
  const tabsWrap = document.createElement('div');
  tabsWrap.id = 'portero-tabs-wrap';
  tabsWrap.className = 'no-print';
  tabsWrap.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px clamp(8px,6vw,120px);border-bottom:1px solid var(--border-default);background:var(--bg-surface);';

  PORTERO_SLOTS.forEach(slot => {
    const name = _porteroSlots[slot]?.name || '';
    const btn  = document.createElement('button');
    btn.className = 'btn ' + (_activeSlot === slot ? 'btn-primary' : 'btn-ghost') + ' btn-sm';
    btn.id = `tab-slot-${slot}`;
    btn.style.cssText = 'min-width:80px;position:relative;';
    btn.innerHTML = name
      ? `<span>${name}</span>`
      : `<span style="color:var(--text-muted);">+ Portero ${slot}</span>`;
    btn.addEventListener('click', () => {
      _activeSlot = slot;
      _renderPorteroTabs(panel, monday, days, weekId, season);
    });
    tabsWrap.appendChild(btn);
  });

  panel.appendChild(tabsWrap);

  // Área del slot activo
  const gridWrap = document.createElement('div');
  gridWrap.id = 'portero-grid-wrap';

  // Cabecera del portero activo
  const slotData = _porteroSlots[_activeSlot];
  const header   = document.createElement('div');
  header.className = 'no-print';
  header.style.cssText = 'display:flex;align-items:center;gap:16px;padding:10px clamp(8px,6vw,120px);background:var(--bg-surface);border-bottom:1px solid var(--border-default);margin-bottom:8px;';
  header.innerHTML = `
    <div style="position:relative;width:64px;height:64px;border-radius:50%;
      border:2px dashed var(--border-default);overflow:hidden;
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;background:var(--bg-raised);flex-shrink:0;">
      <span id="slot-photo-placeholder-${_activeSlot}"
        style="font-size:10px;color:var(--text-muted);text-align:center;${slotData.photo ? 'display:none;' : ''}">📷</span>
      <img id="slot-photo-img-${_activeSlot}" src="${slotData.photo || ''}"
        style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;${slotData.photo ? '' : 'display:none;'}" />
      <input type="file" id="slot-photo-input-${_activeSlot}" accept="image/*"
        style="position:absolute;inset:0;opacity:0;cursor:pointer;" />
    </div>
    <div style="flex:1;">
      <div style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">
        Portero ${_activeSlot}
      </div>
      <input type="text" id="slot-name-input-${_activeSlot}"
        placeholder="Nombre del portero..."
        value="${slotData.name || ''}"
        style="font-size:18px;font-weight:800;border:none;outline:none;
          background:transparent;color:var(--text-primary);width:100%;
          border-bottom:2px solid var(--border-default);padding-bottom:3px;" />
    </div>
    <button id="btn-save-slot-${_activeSlot}" class="btn btn-ghost btn-sm no-print" style="font-size:11px;">Guardar</button>
  `;
  gridWrap.appendChild(header);
  panel.appendChild(gridWrap);

  // Listeners del slot activo
  const slot = _activeSlot;

  document.getElementById(`slot-name-input-${slot}`).addEventListener('input', e => {
    _porteroSlots[slot].name = e.target.value;
  });

  document.getElementById(`btn-save-slot-${slot}`).addEventListener('click', async () => {
    const name = document.getElementById(`slot-name-input-${slot}`)?.value?.trim() || '';
    _porteroSlots[slot].name = name;
    try {
      await savePorteroSlot(season.seasonKey, weekId, slot, _porteroSlots[slot]);
      window.__edpPorteroSlots = _porteroSlots;
      // Actualizar tab
      _renderPorteroTabs(panel, monday, days, weekId, season);
    } catch (err) { showError('Error guardando: ' + err.message); }
  });

  document.getElementById(`slot-photo-input-${slot}`).addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await uploadPorteroSlotPhoto(file);
      _porteroSlots[slot].photo = base64;
      window.__edpPorteroSlots = _porteroSlots;
      await savePorteroSlot(season.seasonKey, weekId, slot, _porteroSlots[slot]);
      const img = document.getElementById(`slot-photo-img-${slot}`);
      const ph  = document.getElementById(`slot-photo-placeholder-${slot}`);
      if (img) { img.src = base64; img.style.display = 'block'; }
      if (ph)  ph.style.display = 'none';
    } catch (err) { showError('Error subiendo foto: ' + err.message); }
  });

  // Grid semanal del slot activo
  const teamKey = `PORTERO_${slot}`;
  _renderGrid(gridWrap, monday, days, weekId, season, teamKey);
}

// ── GRID SEMANAL ──────────────────────────────────

function _renderGrid(container, monday, days, weekId, season, teamKey) {
  const grid = document.createElement('div');
  grid.className = 'week-grid';
  grid.id = `week-grid-${teamKey}`;
  container.appendChild(grid);

  const today = new Date();
  days.forEach(date => {
    const col = renderDayColumn(date, null, isSameDay(date, today), teamKey);
    col.dataset.dateKey = toDateKey(date);
    grid.appendChild(col);
  });

  const unsub = listenWeekPlans(
    season.seasonKey,
    teamKey,
    weekId,
    plans => {
      const byDate = {};
      plans.forEach(p => { byDate[p.date] = p; });

      // Exponer planes del equipo/slot activo
      if (teamKey === porterosState.activeTeam || teamKey === `PORTERO_${_activeSlot}`) {
        window.__edpWeekPlans = byDate;
      }

      const g = document.getElementById(`week-grid-${teamKey}`);
      if (!g) return;
      g.innerHTML = '';
      days.forEach(date => {
        const col = renderDayColumn(date, byDate[toDateKey(date)] || null, isSameDay(date, today), teamKey);
        col.dataset.dateKey = toDateKey(date);
        g.appendChild(col);
      });
    },
    err => showError('Error cargando semana: ' + err.message),
  );
  _unsubPlans.push(unsub);
}

function navigate(n) {
  setPorterosState({ currentMonday: addWeeks(porterosState.currentMonday, n) });
  renderWeekPlanning();
}

function goToday() {
  setPorterosState({ currentMonday: getMondayOfWeek(new Date()) });
  renderWeekPlanning();
}
