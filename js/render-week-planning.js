// ================================================
// RENDER-WEEK-PLANNING.JS
// ================================================
import { printWeek, printAllWeeks }    from './render-print-week.js';
import { porterosState, setPorterosState } from './porteros-state.js';
import {
  getMondayOfWeek, getWeekDays, addWeeks,
  formatWeekRange, getWeekKey, getMicroNumber,
  getMicroNumberForTeam, toDateKey, isSameDay,
} from './dates.js';
import { listenWeekPlans, upsertWeek, saveWeekMicro, getWeekMicro } from './firebase-service.js';
import { renderDayColumn }             from './render-day-column.js';
import { showError }                   from './utils.js';

let _unsubPlans  = null;
let _microOverride = null; // número manual guardado en Firebase para esta semana+equipo
window.__edpWeekPlans = {};

export function renderWeekPlanning() {
  const panel = document.getElementById('view-semana');
  if (!panel) return;
  panel.innerHTML = '';

  if (!porterosState.activeTeam) {
    panel.innerHTML = `<div class="state-empty"><div class="state-empty-icon">👆</div><p>Selecciona un equipo.</p></div>`;
    return;
  }
  if (!porterosState.activeSeason) {
    panel.innerHTML = `<div class="state-empty"><div class="state-empty-icon">📅</div><p>No hay temporada activa.<br>Crea una en <strong>Configuración</strong>.</p></div>`;
    return;
  }

  const monday = porterosState.currentMonday;
  const days   = getWeekDays(monday);
  const weekId = getWeekKey(monday);
  const season = porterosState.activeSeason;

  // Calcular microciclo base para este equipo
  const microBase = getMicroNumberForTeam(
    monday,
    porterosState.activeTeam,
    porterosState.microciclos,
  );

  // Cargar override de Firebase si existe
  _microOverride = null;
  getWeekMicro(season.seasonKey, porterosState.activeTeam, weekId)
    .then(saved => {
      _microOverride = saved;
      _renderNav(panel, monday, days, weekId, microBase, season);
    })
    .catch(() => {
      _renderNav(panel, monday, days, weekId, microBase, season);
    });

  upsertWeek({
    id:          weekId,
    seasonKey:   season.seasonKey,
    weekNumber:  parseInt(weekId.split('-W')[1]),
    microNumber: microBase,
    mondayDate:  toDateKey(monday),
    sundayDate:  toDateKey(days[6]),
    label:       formatWeekRange(monday),
  }).catch(err => showError('Error guardando semana: ' + err.message));

  // Renderizado provisional mientras carga el override
  _renderNav(panel, monday, days, weekId, microBase, season);
}

function _renderNav(panel, monday, days, weekId, microBase, season) {
  // Quitar nav anterior si existe
  const oldNav = panel.querySelector('.week-nav');
  if (oldNav) oldNav.remove();

  const microN = _microOverride ?? microBase;

  const nav = document.createElement('div');
  nav.className = 'week-nav no-print';
  nav.innerHTML = `
    <button class="btn btn-ghost btn-icon" id="btn-prev-week">◀</button>
    <div class="week-nav-info">
      <div class="week-nav-label">${formatWeekRange(monday)}</div>
      <div class="week-nav-sub" style="display:flex;align-items:center;gap:6px;justify-content:center;">
        <span>Microciclo</span>
        <input type="number" id="micro-input"
          value="${microN}"
          min="1" max="99"
          style="width:48px;text-align:center;font-size:11px;font-weight:700;
            border:1px solid var(--border-default);border-radius:4px;
            padding:1px 4px;background:var(--bg-raised);color:var(--text-primary);" />
        <button id="btn-save-micro" class="btn btn-ghost btn-sm"
          style="font-size:10px;padding:2px 6px;">✓</button>
        <span>·</span>
        <span>${season.name || season.seasonKey}</span>
      </div>
    </div>
    <button class="btn btn-ghost" id="btn-today-week">Hoy</button>
    <button class="btn btn-ghost btn-icon" id="btn-next-week">▶</button>
    <button class="btn btn-ghost no-print" id="btn-print-week" title="Imprimir este equipo">🖨️</button>
    <button class="btn btn-ghost no-print" id="btn-print-all" title="Imprimir todos los equipos">🖨️ Todos</button>
  `;

  // Insertar nav al principio del panel
  const grid = panel.querySelector('#week-grid');
  if (grid) {
    panel.insertBefore(nav, grid);
  } else {
    panel.appendChild(nav);
    _renderGrid(panel, monday, days, weekId, season);
  }

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
      document.getElementById('btn-save-micro').textContent = '✓';
      setTimeout(() => {
        const btn = document.getElementById('btn-save-micro');
        if (btn) btn.textContent = '✓';
      }, 1000);
    } catch (err) {
      showError('Error guardando microciclo: ' + err.message);
    }
  });
}

function _renderGrid(panel, monday, days, weekId, season) {
  // Grid
  const grid = document.createElement('div');
  grid.className = 'week-grid';
  grid.id = 'week-grid';
  panel.appendChild(grid);

  const today = new Date();
  days.forEach(date => {
    const col = renderDayColumn(date, null, isSameDay(date, today));
    col.dataset.dateKey = toDateKey(date);
    grid.appendChild(col);
  });

  // Escuchar Firebase
  if (_unsubPlans) { _unsubPlans(); _unsubPlans = null; }

  _unsubPlans = listenWeekPlans(
    season.seasonKey,
    porterosState.activeTeam,
    weekId,
    plans => {
      const byDate = {};
      plans.forEach(p => { byDate[p.date] = p; });
      window.__edpWeekPlans = byDate;

      const g = document.getElementById('week-grid');
      if (!g) return;
      g.innerHTML = '';
      days.forEach(date => {
        const col = renderDayColumn(date, byDate[toDateKey(date)] || null, isSameDay(date, today));
        col.dataset.dateKey = toDateKey(date);
        g.appendChild(col);
      });
    },
    err => showError('Error cargando semana: ' + err.message),
  );
}

function navigate(n) {
  setPorterosState({ currentMonday: addWeeks(porterosState.currentMonday, n) });
  renderWeekPlanning();
}

function goToday() {
  setPorterosState({ currentMonday: getMondayOfWeek(new Date()) });
  renderWeekPlanning();
}

