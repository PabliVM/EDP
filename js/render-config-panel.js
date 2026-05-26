// ================================================
// RENDER-CONFIG-PANEL.JS — Panel lateral config
// ================================================

import { porterosState, setPorterosState } from './porteros-state.js';
import { PORTEROS_TEAMS, BLOCK_TYPES }      from './porteros-constants.js';
import {
  listenSeasons, createSeason, setActiveSeason,
  saveConfigSection, listenConfig,
} from './firebase-service.js';
import { showError, showSuccess, safeText } from './utils.js';

let _seasons    = [];
let _conceptos  = {};
let _unsubSeas  = null;
let _unsubCfg   = null;
let _activeTab  = 'temporadas';

// Solo estos bloques tienen conceptos editables
const BLOQUES_CON_CONCEPTOS = ['preparacion_fisica', 'entrenamiento_campo'];

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
  if (_unsubCfg)  { _unsubCfg();  _unsubCfg  = null; }
}

function renderPanelContent(panel) {
  panel.innerHTML = `
    <div class="config-panel-header">
      <span class="config-panel-title">⚙ Configuración</span>
      <button class="modal-close" id="config-close">✕</button>
    </div>

    <div style="display:flex;border-bottom:1px solid var(--border-default);padding:0 20px;">
      <button class="config-tab-btn ${_activeTab === 'temporadas' ? 'active' : ''}"
        data-ctab="temporadas">Temporadas</button>
      <button class="config-tab-btn ${_activeTab === 'conceptos' ? 'active' : ''}"
        data-ctab="conceptos">Conceptos</button>
    </div>

    <div class="config-panel-body">
      <div id="cp-tab-temporadas" ${_activeTab !== 'temporadas' ? 'style="display:none"' : ''}></div>
      <div id="cp-tab-conceptos"  ${_activeTab !== 'conceptos'  ? 'style="display:none"' : ''}></div>
    </div>
  `;

  document.getElementById('config-close').addEventListener('click', closeConfigPanel);

  document.querySelectorAll('.config-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeTab = btn.dataset.ctab;
      document.querySelectorAll('.config-tab-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.ctab === _activeTab)
      );
      document.getElementById('cp-tab-temporadas').style.display = _activeTab === 'temporadas' ? '' : 'none';
      document.getElementById('cp-tab-conceptos').style.display  = _activeTab === 'conceptos'  ? '' : 'none';
    });
  });

  renderTabTemporadas();
  renderTabConceptos();

  if (_unsubSeas) _unsubSeas();
  _unsubSeas = listenSeasons(
    seasons => { _seasons = seasons; renderSeasonsList(); },
    err => showError('Error: ' + err.message),
  );

  if (_unsubCfg) _unsubCfg();
  _unsubCfg = listenConfig(
    cfg => {
      _conceptos = cfg.conceptos || {};
      setPorterosState({ conceptos: _conceptos });
      renderConceptosList();
    },
    err => showError('Error config: ' + err.message),
  );
}

// ── PESTAÑA TEMPORADAS ────────────────────────────

function renderTabTemporadas() {
  const tab = document.getElementById('cp-tab-temporadas');
  if (!tab) return;

  tab.innerHTML = `
    <div class="config-section-title mt-12">Temporadas</div>
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
    <p class="text-muted text-xs mb-12">Fecha de inicio y número inicial del microciclo 1.</p>
    <div id="cp-micro-list"></div>
    <button class="btn btn-primary btn-sm w-full mt-12" id="cp-btn-save-micro">Guardar microciclos</button>
  `;

  document.getElementById('cp-btn-create').addEventListener('click', createSeasonHandler);
  document.getElementById('cp-btn-save-micro').addEventListener('click', saveMicrociclos);

  renderMicroList();
}

function renderSeasonsList() {
  const list = document.getElementById('cp-seasons-list');
  if (!list) return;

  if (_seasons.length === 0) {
    list.innerHTML = `<p class="text-muted text-xs">No hay temporadas.</p>`;
    return;
  }

  list.innerHTML = _seasons.map(s => `
    <div style="display:flex;align-items:center;gap:8px;padding:8px;
      background:var(--bg-raised);
      border:1px solid ${s.isActive ? 'var(--blue-500)' : 'var(--border-default)'};
      border-radius:var(--radius-sm);margin-bottom:5px;">
      <div style="flex:1;">
        <div style="font-weight:700;font-size:12px;">
          ${safeText(s.name || s.seasonKey)}
          ${s.isActive ? '<span class="badge badge-blue" style="margin-left:4px;">Activa</span>' : ''}
        </div>
        <div class="text-xs text-muted">${s.startDate || '—'} → ${s.endDate || '—'}</div>
      </div>
      ${!s.isActive ? `<button class="btn btn-ghost btn-sm" data-activate="${s.id}">Activar</button>` : ''}
      <button class="btn btn-sm" style="color:#ef4444;border-color:#7f1d1d;background:transparent;"
        data-delete="${s.id}">✕</button>
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

function renderMicroList() {
  const list   = document.getElementById('cp-micro-list');
  if (!list) return;
  const micros = porterosState.microciclos || {};

  list.innerHTML = PORTEROS_TEAMS.map(team => `
    <div style="display:grid;grid-template-columns:48px 1fr 64px;
      align-items:center;gap:8px;margin-bottom:6px;">
      <span class="fw-700" style="font-size:12px;">${safeText(team.label)}</span>
      <input type="date" class="input" id="micro-date-${team.key}"
        value="${micros[team.key]?.startDate || ''}" />
      <input type="number" class="input" id="micro-num-${team.key}"
        value="${micros[team.key]?.startNumber ?? 1}"
        min="1" max="99" title="Nº inicial" style="text-align:center;" />
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

// ── PESTAÑA CONCEPTOS ─────────────────────────────

function renderTabConceptos() {
  const tab = document.getElementById('cp-tab-conceptos');
  if (!tab) return;

  tab.innerHTML = `
    <div class="config-section-title mt-12">Conceptos por bloque</div>
    <p class="text-muted text-xs mb-12">
      Define los conceptos que aparecerán en los desplegables de cada bloque de entrenamiento.
    </p>
    <div id="cp-conceptos-list"></div>
    <button class="btn btn-primary btn-sm w-full mt-12" id="cp-btn-save-conceptos">
      Guardar conceptos
    </button>
  `;

  document.getElementById('cp-btn-save-conceptos').addEventListener('click', saveConceptos);
  renderConceptosList();
}

function renderConceptosList() {
  const list = document.getElementById('cp-conceptos-list');
  if (!list) return;

  list.innerHTML = BLOCK_TYPES
    .filter(block => BLOQUES_CON_CONCEPTOS.includes(block.key))
    .map(block => {
      const items = (_conceptos[block.key] || []).join('\n');
      return `
        <div class="mb-12">
          <label class="label">${safeText(block.label)}</label>
          <textarea class="textarea" id="cp-conceptos-${block.key}"
            rows="4"
            placeholder="Un concepto por línea..."
            style="font-size:12px;">${safeText(items)}</textarea>
          <div class="text-xs text-muted" style="margin-top:3px;">Un concepto por línea</div>
        </div>
      `;
    }).join('');
}

async function saveConceptos() {
  const conceptos = {};

  BLOCK_TYPES
    .filter(block => BLOQUES_CON_CONCEPTOS.includes(block.key))
    .forEach(block => {
      const textarea = document.getElementById(`cp-conceptos-${block.key}`);
      if (!textarea) return;
      conceptos[block.key] = textarea.value
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    });

  const btn = document.getElementById('cp-btn-save-conceptos');
  btn.disabled = true;
  try {
    await saveConfigSection('conceptos', conceptos);
    setPorterosState({ conceptos });
    _conceptos = conceptos;
    showSuccess('Conceptos guardados.');
  } catch (err) {
    showError('Error: ' + err.message);
  } finally {
    btn.disabled = false;
  }
}

