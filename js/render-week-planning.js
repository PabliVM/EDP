// ================================================
// RENDER-WEEK-PLANNING.JS
// ================================================

import { porterosState, setPorterosState } from './porteros-state.js';
import {
  getMondayOfWeek, getWeekDays, addWeeks,
  formatWeekRange, getWeekKey, getMicroNumber,
  toDateKey, isSameDay,
} from './dates.js';
import { listenWeekPlans, upsertWeek } from './firebase-service.js';
import { renderDayColumn }             from './render-day-column.js';
import { showError }                   from './utils.js';

let _unsubPlans = null;

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
  const microN = getMicroNumber(monday, porterosState.activeSeason.startDate);

  upsertWeek({
    id:          weekId,
    seasonKey:   porterosState.activeSeason.seasonKey,
    weekNumber:  parseInt(weekId.split('-W')[1]),
    microNumber: microN,
    mondayDate:  toDateKey(monday),
    sundayDate:  toDateKey(days[6]),
    label:       formatWeekRange(monday),
  }).catch(err => showError('Error guardando semana: ' + err.message));

  // ── NAV ──
  const nav = document.createElement('div');
  nav.className = 'week-nav';
nav.innerHTML = `
  <button class="btn btn-ghost btn-sm" id="btn-equipos">← Equipos</button>
  <button class="btn btn-ghost btn-icon" id="btn-prev-week">◀</button>
  <div class="week-nav-info">
    <div class="week-nav-label">${formatWeekRange(monday)}</div>
    <div class="week-nav-sub">Microciclo ${microN} · ${porterosState.activeSeason.name || porterosState.activeSeason.seasonKey}</div>
  </div>
  <button class="btn btn-ghost" id="btn-today-week">Hoy</button>
  <button class="btn btn-ghost btn-icon" id="btn-next-week">▶</button>
`;
  panel.appendChild(nav);

document.getElementById('btn-prev-week').addEventListener('click',  () => navigate(-1));
document.getElementById('btn-next-week').addEventListener('click',  () => navigate(1));
document.getElementById('btn-today-week').addEventListener('click', () => goToday());
document.getElementById('btn-equipos').addEventListener('click', () => {
  import('./render-inicio.js').then(({ renderInicio }) => renderInicio());
});

  // ── GRID ──
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

  // ── ESCUCHAR FIREBASE ──
  if (_unsubPlans) { _unsubPlans(); _unsubPlans = null; }

  _unsubPlans = listenWeekPlans(
    porterosState.activeSeason.seasonKey,
    porterosState.activeTeam,
    weekId,
    plans => {
      const byDate = {};
      plans.forEach(p => { byDate[p.date] = p; });
      const grid = document.getElementById('week-grid');
      if (!grid) return;
      grid.innerHTML = '';
      days.forEach(date => {
        const col = renderDayColumn(date, byDate[toDateKey(date)] || null, isSameDay(date, today));
        col.dataset.dateKey = toDateKey(date);
        grid.appendChild(col);
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
