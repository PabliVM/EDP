// ================================================
// APP.JS — Bootstrap
// ================================================

import { initFirebase, listenSeasons, listenConfig, initConfigIfEmpty } from './firebase-service.js';
import { porterosState, setPorterosState } from './porteros-state.js';
import { PORTEROS_ICONS }                  from './porteros-constants.js';
import { renderHeader }                    from './render-header.js';
import { renderTeamBar }                   from './render-team-bar.js';
import { renderTabs, switchTab }           from './render-tabs.js';
import { renderFooter }                    from './render-footer.js';
import { renderWeekPlanning }              from './render-week-planning.js';
import { showError }                       from './utils.js';

function renderOverlay() {
  if (document.getElementById('porteros-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'porteros-overlay';
  overlay.className = 'overlay hidden';
  overlay.innerHTML = `<div id="porteros-modal" class="modal"></div>`;
  document.body.appendChild(overlay);
}

function renderTeamBarContainer() {
  if (document.getElementById('rm-team-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'rm-team-bar';
  bar.style.cssText = `
    position:sticky;top:56px;z-index:90;
    height:44px;background:var(--bg-surface);
    border-bottom:1px solid var(--border-default);
    overflow-x:auto;overflow-y:hidden;scrollbar-width:none;
  `;
  document.getElementById('rm-tabs').insertAdjacentElement('beforebegin', bar);
}

function setupEvents() {
  document.addEventListener('porteros:team-changed', () => {
    if (porterosState.activeTab === 'semana') renderWeekPlanning();
  });

  document.addEventListener('rm:season-changed', () => {
    if (porterosState.activeTab === 'semana') renderWeekPlanning();
  });

  document.addEventListener('rm:tab-changed', e => {
    setPorterosState({ activeTab: e.detail });
    if (e.detail === 'semana') renderWeekPlanning();
  });
}

function loadSeasons() {
  listenSeasons(
    seasons => {
      const active = seasons.find(s => s.isActive) || seasons[0] || null;
      if (active && active.id !== porterosState.activeSeason?.id) {
        setPorterosState({ activeSeason: active });
        if (porterosState.activeTab === 'semana') renderWeekPlanning();
      }
    },
    err => showError('Error cargando temporadas: ' + err.message),
  );
}

function loadConfig() {
  listenConfig(
    cfg => {
      setPorterosState({ icons: cfg.icons || PORTEROS_ICONS });
      renderHeader();
    },
    err => showError('Error cargando config: ' + err.message),
  );
}

async function boot() {
  initFirebase();

  try {
    await initConfigIfEmpty();
  } catch (err) {
    showError('Firebase: ' + err.message);
    setPorterosState({ icons: PORTEROS_ICONS });
  }

  renderOverlay();
  renderFooter();
  renderHeader();
  renderTeamBarContainer();
  renderTeamBar();
  renderTabs();
  setupEvents();
  loadSeasons();
  loadConfig();

  setTimeout(() => {
    if (porterosState.activeTab === 'semana') renderWeekPlanning();
  }, 600);
}

document.addEventListener('DOMContentLoaded', boot);
