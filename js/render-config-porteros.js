// ================================================
// RENDER-CONFIG-PORTEROS.JS — Configuración
// ================================================

import { porterosState }           from './porteros-state.js';
import { listenSeasons, createSeason, setActiveSeason } from './firebase-service.js';
import { showError, showSuccess }  from './utils.js';

let _seasons   = [];
let _unsubSeas = null;

export function renderConfig() {
  const panel = document.getElementById('tab-configuracion');
  if (!panel) return;

  panel.innerHTML = `
    <div style="max-width:600px;margin:0 auto;padding:16px;">

      <div class="card mb-16">
        <div class="card-title">Temporadas</div>

        <div id="seasons-list" class="mb-16"></div>

        <hr class="divider" />

        <div class="section-title mb-8">Nueva temporada</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          <div class="field-group">
            <label class="label">Nombre</label>
            <input type="text" class="input" id="s-name" placeholder="Ej: Temporada 2026/2027" />
          </div>
          <div class="field-group">
            <label class="label">Clave</label>
            <input type="text" class="input" id="s-key" placeholder="Ej: 2026-27" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
          <div class="field-group">
            <label class="label">Fecha inicio</label>
            <input type="date" class="input" id="s-start" />
          </div>
          <div class="field-group">
            <label class="label">Fecha fin</label>
            <input type="date" class="input" id="s-end" />
          </div>
        </div>
        <button class="btn btn-primary" id="btn-create-season">Crear temporada</button>
      </div>

    </div>
  `;

  if (_unsubSeas) _unsubSeas();
  _unsubSeas = listenSeasons(
    seasons => { _seasons = seasons; renderSeasonsList(); },
    err => showError('Error: ' + err.message),
  );

  document.getElementById('btn-create-season').addEventListener('click', createSeasonHandler);
}

function renderSeasonsList() {
  const list = document.getElementById('seasons-list');
  if (!list) return;

  if (_seasons.length === 0) {
    list.innerHTML = `<p class="text-muted text-sm">No hay temporadas. Crea la primera.</p>`;
    return;
  }

  list.innerHTML = _seasons.map(s => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-raised);border:1px solid var(--border-default);border-radius:var(--radius-sm);margin-bottom:6px;${s.isActive ? 'border-color:var(--blue-500);' : ''}">
      <div style="flex:1;">
        <div style="font-weight:700;font-size:13px;">
          ${s.name || s.seasonKey}
          ${s.isActive ? '<span class="badge badge-blue" style="margin-left:6px;">Activa</span>' : ''}
        </div>
        <div class="text-muted text-xs">${s.startDate || '—'} → ${s.endDate || '—'}</div>
      </div>
      ${!s.isActive ? `<button class="btn btn-ghost btn-sm" data-activate="${s.id}">Activar</button>` : ''}
      <button class="btn btn-sm" style="color:#ef4444;border-color:#7f1d1d;background:transparent;" data-delete="${s.id}">Borrar</button>
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
    btn.addEventListener('click', () => {
      const season = _seasons.find(s => s.id === btn.dataset.delete);
      if (!season) return;
      const ok = confirm(`¿Borrar la temporada "${season.name || season.seasonKey}"?\nEsta acción no se puede deshacer.`);
      if (!ok) return;
      deleteSeason(btn.dataset.delete);
    });
  });
}

async function createSeasonHandler() {
  const name  = document.getElementById('s-name').value.trim();
  const key   = document.getElementById('s-key').value.trim();
  const start = document.getElementById('s-start').value;
  const end   = document.getElementById('s-end').value;

  if (!name)  { showError('El nombre es obligatorio.'); return; }
  if (!key)   { showError('La clave es obligatoria.'); return; }
  if (!start) { showError('La fecha de inicio es obligatoria.'); return; }
  if (!end)   { showError('La fecha de fin es obligatoria.'); return; }
  if (start >= end) { showError('La fecha de inicio debe ser anterior a la de fin.'); return; }

  const btn = document.getElementById('btn-create-season');
  btn.disabled = true;

  try {
    await createSeason({ name, seasonKey: key, startDate: start, endDate: end, isActive: false });
    document.getElementById('s-name').value  = '';
    document.getElementById('s-key').value   = '';
    document.getElementById('s-start').value = '';
    document.getElementById('s-end').value   = '';
    showSuccess('Temporada creada.');
  } catch (err) {
    showError('Error creando temporada: ' + err.message);
  } finally {
    btn.disabled = false;
  }
}

async function deleteSeason(id) {
  try {
    const { deleteDocument } = await import('./firebase-service.js');
    await deleteDocument('porteros_seasons', id);
    showSuccess('Temporada borrada.');
  } catch (err) {
    showError('Error borrando: ' + err.message);
  }
}
