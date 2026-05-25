// ================================================
// RENDER-CONFIG-PANEL.JS — Panel lateral config
// ================================================

import { porterosState, setPorterosState } from './porteros-state.js';
import { PORTEROS_TEAMS }                   from './porteros-constants.js';
import {
  listenSeasons, createSeason, setActiveSeason,
  saveConfigSection,
} from './firebase-service.js';
import { showError, showSuccess, safeText } from './utils.js';

let _seasons   = [];
let _unsubSeas = null;

export function openConfigPanel() {
  const overlay = document.getElementById('config-panel-overlay');
  const panel   = document.getElementById('config-panel');
  if (!overlay || !panel) return;

  overlay.classList.remove('hidden');
  renderPanelContent(panel);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeConfigPanel();
  }, { once: true });
}

export function closeConfigPanel() {
  document.getElementById('config-panel-overlay')?.classList.add('hidden');
  if (_unsubSeas) { _unsubSeas(); _unsubSeas = null; }
}

function renderPanelContent(panel) {
  panel.innerHTML = `
    <div class="config-panel-header">
      <span class="config-panel-title">⚙ Configuración</span>
      <button class="modal-close" id="config-close">✕</button>
    </div>

    <div class="config-panel-body">

      <div class="config-section-title">Temporadas</div>
      <div id="cp-seasons-list" class="mb-12"></div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div class="field-group">
          <label class="label">Nombre</label>
          <input type="text" class="input" id="cp-s-name" placeholder="Temporada 2026/2027" />
        </div>
        <div class="field-group">
          <label class="label">Clave</label>
          <input type="text" class="input" id="cp-s-key" placeholder="2026-27" />
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div class="field-group">
          <label class="label">Inicio</label>
          <input type="date" class="input" id="cp-s-start" />
        </div>
        <div class="field-group">
          <label class="label">Fin</label>
          <input type="date" class="input" id="cp-s-end" />
        </div>
      </div>
      <button class="btn btn-primary btn-sm w-full mb-16" id="cp-btn-create">Crear temporada</button>

      <hr class="divider" />

      <div class="config-section-title mt-12">Inicio de microciclo por equipo</div>
      <p class="text-muted text-xs mb-12">Define la fecha desde la que empieza a contar el microciclo 1 de cada equipo.</p>
      <div id="cp-micro-list"></div>
      <button class="btn btn-primary btn-sm w-full mt-12" id="cp-btn-save-micro">Guardar microciclos</button>

    </div>
  `;

  document.getElementById('config-close').addEventListener('click', closeConfigPanel);
  document.getElementById('cp-btn-create').addEventListener('click', createSeasonHandler);
  document.getElementById('cp-btn-save-micro').addEventListener('click', saveMicrociclos);

  renderMicroList();

  if (_unsubSeas) _unsubSeas();
  _unsubSeas = listenSeasons(
    seasons => { _seasons = seasons; renderSeasonsList(); },
    err => showError('Error: ' + err.message),
  );
}

// ── TEMPORADAS ────────────────────────────────────

function renderSeasonsList() {
  const list = document.getElementById('cp-seasons-list');
  if (!list) return;

  if (_seasons.length === 0) {
    list.innerHTML = `<p class="text-muted text-xs">No hay temporadas.</p>`;
    return;
  }

  list.innerHTML = _seasons.map(s => `
    <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg-raised);border:1px solid ${s.isActive ? 'var(--blue-500)' : 'var(--border-default)'};border-radius:var(--radius-sm);margin-bottom:5px;">
      <div style="flex:1;">
        <div style="font-weight:700;font-size:12px;">
          ${safeText(s.name || s.seasonKey)}
          ${s.isActive ? '<span class="badge badge-blue" style="margin-left:4px;">Activa</span>' : ''}
        </div>
        <div class="text-xs text-muted">${s.startDate || '—'} → ${s.endDate || '—'}</div>
      </div>
      ${!s.isActive ? `<button class="btn btn-ghost btn-sm" data-activate="${s.id}">Activar</button>` : ''}
      <button class="btn btn-sm" style="color:#ef4444;border-color:#7f1d1d;background:transparent;" data-delete="${s.id}">✕</button>
    </div>
  `).join('');

  list.querySelectorAll('[data-activate]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await setActiveSeason(btn.dataset.activate);
        showSuccess('Temporada activada.');
      } catch (err) {
        showError('Error: ' + err.message);
        btn.disabled = false;
      }
    });
  });

  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s = _seasons.find(x => x.id === btn.dataset.delete);
      if (!confirm(`¿Borrar "${s?.name || s?.seasonKey}"?`)) return;
      try {
        const { deleteDocument } = await import('./firebase-service.js');
        await deleteDocument('porteros_seasons', btn.dataset.delete);
        showSuccess('Temporada borrada.');
      } catch (err) {
        showError('Error: ' + err.message);
      }
    });
  });
}

async function createSeasonHandler() {
  const name  = document.getElementById('cp-s-name').value.trim();
  const key   = document.getElementById('cp-s-key').value.trim();
  const start = document.getElementById('cp-s-start').value;
  const end   = document.getElementById('cp-s-end').value;

  if (!name || !key || !start || !end) { showError('Rellena todos los campos.'); return; }
  if (start >= end) { showError('La fecha de inicio debe ser anterior al fin.'); return; }

  const btn = document.getElementById('cp-btn-create');
  btn.disabled = true;
  try {
    await createSeason({ name, seasonKey: key, startDate: start, endDate: end, isActive: false });
    ['cp-s-name','cp-s-key','cp-s-start','cp-s-end'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    showSuccess('Temporada creada.');
  } catch (err) {
    showError('Error: ' + err.message);
  } finally {
    btn.disabled = false;
  }
}

// ── MICROCICLOS ───────────────────────────────────

function renderMicroList() {
  const list   = document.getElementById('cp-micro-list');
  if (!list) return;
  const micros = porterosState.microciclos || {};

  list.innerHTML = PORTEROS_TEAMS.map(team => `
    <div style="display:grid;grid-template-columns:48px 1fr 64px;align-items:center;gap:8px;margin-bottom:6px;">
      <span class="fw-700" style="font-size:12px;">${safeText(team.label)}</span>
      <input type="date" class="input" id="micro-date-${team.key}"
        value="${micros[team.key]?.startDate || ''}" />
      <input type="number" class="input" id="micro-num-${team.key}"
        value="${micros[team.key]?.startNumber ?? 1}" min="1" max="99"
        title="Nº inicial" style="text-align:center;" />
    </div>
  `).join('');
}

async function saveMicrociclos() {
  const micros = {};
  PORTEROS_TEAMS.forEach(team => {
    const date = document.getElementById(`micro-date-${team.key}`)?.value || '';
    const num  = parseInt(document.getElementById(`micro-num-${team.key}`)?.value) || 1;
    micros[team.key] = { startDate: date, startNumber: num };
  });

  const btn = document.getElementById('cp-btn-save-micro');
  btn.disabled = true;
  try {
    await saveConfigSection('microciclos', micros);
    setPorterosState({ microciclos: micros });
    showSuccess('Microciclos guardados.');
  } catch (err) {
    showError('Error: ' + err.message);
  } finally {
    btn.disabled = false;
  }
}
