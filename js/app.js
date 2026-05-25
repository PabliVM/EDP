// ================================================
// APP.JS — Bootstrap
// ================================================

import { initFirebase, listenSeasons, listenConfig, initConfigIfEmpty } from './firebase-service.js';
import { porterosState, setPorterosState } from './porteros-state.js';
import { PORTEROS_ICONS }                  from './porteros-constants.js';
import { renderHeader }                    from './render-header.js';
import { renderFooter }                    from './render-footer.js';
import { renderWeekPlanning }              from './render-week-planning.js';
import { renderInicio }                    from './render-inicio.js';
import { openConfigPanel }                 from './render-config-panel.js';
import { showError }                       from './utils.js';

function renderTeamBar() {
  let container = document.getElementById('rm-team-bar');
  if (!container) {
    container = document.createElement('div');
    container.id = 'rm-team-bar';
    container.style.cssText = `
      position:sticky;top:56px;z-index:90;
      height:44px;background:var(--bg-surface);
      border-bottom:1px solid var(--border-default);
      overflow-x:auto;overflow-y:hidden;scrollbar-width:none;
    `;
    document.getElementById('rm-team-bar-container').appendChild(container);
  }

  import('./render-team-bar.js').then(({ renderTeamBar: _render }) => _render());
}

function showView(view) {
  document.getElementById('view-inicio').classList.toggle('hidden', view !== 'inicio');
  document.getElementById('view-semana').classList.toggle('hidden', view !== 'semana');
  setPorterosState({ currentView: view });
  renderHeader();
}

function setupEvents() {
  document.addEventListener('porteros:team-changed', teamKey => {
    showView('semana');
    renderWeekPlanning();
  });

  document.addEventListener('edp:go-inicio', () => {
    showView('inicio');
    renderInicio();
  });

  document.addEventListener('edp:open-config', () => {
    openConfigPanel();
  });

  document.addEventListener('edp:season-changed', () => {
    if (porterosState.currentView === 'semana') renderWeekPlanning();
  });
}

function loadSeasons() {
  listenSeasons(
    seasons => {
      const active = seasons.find(s => s.isActive) || seasons[0] || null;
      const seasonKeys = seasons.map(s => s.seasonKey || s.name);
      setPorterosState({ allSeasons: seasons, seasons: seasonKeys });
      if (active && active.id !== porterosState.activeSeason?.id) {
        setPorterosState({ activeSeason: active });
        renderHeader();
        if (porterosState.currentView === 'semana') renderWeekPlanning();
      }
    },
    err => showError('Error cargando temporadas: ' + err.message),
  );
}

function loadConfig() {
  listenConfig(
    cfg => {
      setPorterosState({
        icons:       cfg.icons       || PORTEROS_ICONS,
        microciclos: cfg.microciclos || {},
      });
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

  renderFooter();
  renderHeader();
  renderTeamBar();
  setupEvents();
  loadSeasons();
  loadConfig();

  showView('inicio');
  renderInicio();
}

document.addEventListener('DOMContentLoaded', boot);
