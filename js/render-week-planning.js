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
  savePorteroName, getPorteroName,
  uploadPorteroPhoto, getPorteroPhoto,
  saveWeekNotes, getWeekNotes,
} from './firebase-service.js';
import { renderDayColumn } from './render-day-column.js';
import { showError }       from './utils.js';

let _unsubPlans    = null;
let _microOverride = null;
window.__edpWeekPlans       = {};
window.__edpPorteroName     = '';
window.__edpPorteroPhotoURL = null;

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

  const isPortero = porterosState.activeTeam === PORTERO_TEAM.key;
  const monday    = porterosState.currentMonday;
  const days      = getWeekDays(monday);
  const weekId    = getWeekKey(monday);
  const season    = porterosState.activeSeason;

  const microBase = getMicroNumberForTeam(
    monday,
    porterosState.activeTeam,
    porterosState.microciclos,
  );

  _microOverride = null;
  getWeekMicro(season.seasonKey, porterosState.activeTeam, weekId)
    .then(saved => {
      _microOverride = saved;
      _renderNav(panel, monday, days, weekId, microBase, season, isPortero);
    })
    .catch(() => {
      _renderNav(panel, monday, days, weekId, microBase, season, isPortero);
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

  _renderNav(panel, monday, days, weekId, microBase, season, isPortero);
}

function _renderNav(panel, monday, days, weekId, microBase, season, isPortero) {
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
          value="${microN}" min="1" max="99"
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

  const grid = panel.querySelector('#week-grid');
  if (grid) {
    panel.insertBefore(nav, grid);
  } else {
    panel.appendChild(nav);

    if (isPortero) {
      _renderPorteroHeader(panel, monday, days, weekId, season);
    } else {
      _renderGrid(panel, monday, days, weekId, season);
    }

    // ── OBS SEMANA — debajo del grid ──
    const obsWrap = document.createElement('div');
    obsWrap.id = 'week-obs-wrap';
    obsWrap.style.cssText = 'padding:12px clamp(8px,6vw,120px) 20px;';
    obsWrap.innerHTML = `
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;
        letter-spacing:0.06em;color:var(--text-muted);margin-bottom:6px;">
        Observaciones del microciclo
      </div>
      <div style="display:flex;gap:8px;align-items:flex-start;">
        <textarea id="week-obs-input" rows="3"
          placeholder="Escribe aquí las observaciones de esta semana..."
          style="flex:1;font-size:12px;padding:8px;border:1px solid var(--border-default);
            border-radius:var(--radius-sm);background:var(--bg-raised);color:var(--text-primary);
            resize:vertical;font-family:var(--font-sans);line-height:1.5;"></textarea>
        <button id="btn-save-week-obs" class="btn btn-ghost btn-sm no-print"
          style="font-size:11px;white-space:nowrap;">Guardar</button>
      </div>
    `;
    panel.appendChild(obsWrap);

    getWeekNotes(season.seasonKey, porterosState.activeTeam, weekId).then(notes => {
      const ta = document.getElementById('week-obs-input');
      if (ta) ta.value = notes || '';
    }).catch(() => {});

    document.getElementById('btn-save-week-obs').addEventListener('click', async () => {
      const notes = document.getElementById('week-obs-input')?.value || '';
      try { await saveWeekNotes(season.seasonKey, porterosState.activeTeam, weekId, notes); }
      catch (err) { showError('Error: ' + err.message); }
    });
  }

  document.getElementById('btn-prev-week').addEventListener('click',  () => navigate(-1));
  document.getElementById('btn-next-week').addEventListener('click',  () => navigate(1));
  document.getElementById('btn-today-week').addEventListener('click', () => goToday());
  document.getElementById('btn-print-week').addEventListener('click', () => {
    const n = parseInt(prompt('¿Cuántas semanas quieres imprimir? (desde la semana actual)', '1'));
    if (isNaN(n) || n < 1) return;
    printWeek(n);
  });
  document.getElementById('btn-print-all').addEventListener('click',  () => printAllWeeks());

  document.getElementById('btn-save-micro').addEventListener('click', async () => {
    const val = parseInt(document.getElementById('micro-input')?.value);
    if (isNaN(val) || val < 1) return;
    try {
      await saveWeekMicro(season.seasonKey, porterosState.activeTeam, weekId, val);
      _microOverride = val;
    } catch (err) {
      showError('Error guardando microciclo: ' + err.message);
    }
  });
}

// ── CABECERA PORTERO INDIVIDUAL ───────────────────

function _renderPorteroHeader(panel, monday, days, weekId, season) {
  const wrap = document.createElement('div');
  wrap.id = 'portero-header-wrap';
  wrap.className = 'no-print';
  wrap.style.cssText = `
    display:flex;align-items:center;gap:16px;
    padding:12px clamp(8px,6vw,120px);
    background:var(--bg-surface);
    border-bottom:1px solid var(--border-default);
    margin-bottom:8px;
  `;

  wrap.innerHTML = `
    <div id="portero-photo-area" style="
      width:80px;height:80px;border-radius:50%;
      border:2px dashed var(--border-default);
      overflow:hidden;display:flex;align-items:center;
      justify-content:center;cursor:pointer;flex-shrink:0;
      background:var(--bg-raised);position:relative;
    " title="Haz clic para subir foto">
      <span id="portero-photo-placeholder" style="font-size:11px;color:var(--text-muted);text-align:center;padding:4px;">📷<br>Foto</span>
      <img id="portero-photo-img" src="" alt="Foto portero"
        style="width:100%;height:100%;object-fit:cover;display:none;position:absolute;inset:0;" />
      <input type="file" id="portero-photo-input" accept="image/*"
        style="position:absolute;inset:0;opacity:0;cursor:pointer;" />
    </div>

    <div style="flex:1;">
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Portero</div>
      <input type="text" id="portero-name-input"
        placeholder="Nombre del portero..."
        value="${window.__edpPorteroName || ''}"
        style="font-size:22px;font-weight:800;border:none;outline:none;
          background:transparent;color:var(--text-primary);width:100%;
          border-bottom:2px solid var(--border-default);padding-bottom:4px;" />
    </div>

    <button id="btn-save-portero-name" class="btn btn-ghost btn-sm no-print"
      style="font-size:11px;">Guardar nombre</button>
  `;

  panel.appendChild(wrap);

  getPorteroPhoto().then(url => {
    if (url) {
      window.__edpPorteroPhotoURL = url;
      _showPorteroPhoto(url);
    }
  }).catch(() => {});

  getPorteroName().then(name => {
    if (name) {
      window.__edpPorteroName = name;
      const input = document.getElementById('portero-name-input');
      if (input) input.value = name;
    }
  }).catch(() => {});

  document.getElementById('btn-save-portero-name').addEventListener('click', async () => {
    const name = document.getElementById('portero-name-input')?.value?.trim() || '';
    try {
      await savePorteroName(name);
      window.__edpPorteroName = name;
    } catch (err) {
      showError('Error guardando nombre: ' + err.message);
    }
  });

  document.getElementById('portero-photo-input').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadPorteroPhoto(file);
      window.__edpPorteroPhotoURL = url;
      _showPorteroPhoto(url);
    } catch (err) {
      showError('Error subiendo foto: ' + err.message);
    }
  });

  _renderGrid(panel, monday, days, weekId, season);
}

function _showPorteroPhoto(url) {
  const img         = document.getElementById('portero-photo-img');
  const placeholder = document.getElementById('portero-photo-placeholder');
  if (img) { img.src = url; img.style.display = 'block'; }
  if (placeholder) placeholder.style.display = 'none';
}

// ── GRID SEMANAL ──────────────────────────────────

function _renderGrid(panel, monday, days, weekId, season) {
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
