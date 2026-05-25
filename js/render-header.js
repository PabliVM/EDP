// ================================================
// RENDER-HEADER.JS
// ================================================

import { porterosState, setPorterosState } from './porteros-state.js';
import { LOGO_PATH }                        from './constants.js';
import { safeText, showError }              from './utils.js';

export function renderHeader() {
  const header = document.getElementById('rm-header');
  if (!header) return;

  const isInicio = !porterosState.activeTeam || porterosState.currentView === 'inicio';

  header.innerHTML = `
    <div class="rm-header-inner">
      <div class="header-left">
        <div class="header-logo">
          <img src="${LOGO_PATH}" alt="RM" />
        </div>
        <span class="header-app-name">Coordinación EDP</span>
      </div>
      <div class="header-right">
        ${!isInicio ? `<button class="btn-header-action" id="btn-equipos" title="Volver a equipos">← Equipos</button>` : ''}
        <select class="season-select" id="season-select" title="Temporada activa">
          ${porterosState.seasons.map(s => `
            <option value="${safeText(s)}" ${s === porterosState.activeSeason?.seasonKey ? 'selected' : ''}>
              ${safeText(s)}
            </option>
          `).join('')}
        </select>
        <button class="btn-header-icon" id="btn-add-season" title="Añadir temporada">＋</button>
        <button class="btn-header-action" id="btn-config" title="Configuración">⚙ Config</button>
        <button class="btn-header-icon" id="btn-theme" title="Modo oscuro">
          ${porterosState.darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-theme').addEventListener('click', toggleTheme);
  document.getElementById('btn-config').addEventListener('click', openConfig);
  document.getElementById('btn-add-season')?.addEventListener('click', onAddSeason);
  document.getElementById('season-select')?.addEventListener('change', onSeasonChange);
  document.getElementById('btn-equipos')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('edp:go-inicio'));
  });
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  setPorterosState({ darkMode: isDark });
  renderHeader();
}

function openConfig() {
  document.dispatchEvent(new CustomEvent('edp:open-config'));
}

function onSeasonChange(e) {
  const seasonKey = e.target.value;
  const season = porterosState.allSeasons?.find(s => s.seasonKey === seasonKey);
  if (season) {
    setPorterosState({ activeSeason: season });
    document.dispatchEvent(new CustomEvent('edp:season-changed', { detail: season }));
  }
}

async function onAddSeason() {
  const input = prompt('Nueva temporada (formato YYYY/YYYY):');
  if (!input) return;
  const value = input.trim();
  if (!/^\d{4}\/\d{4}$/.test(value)) {
    showError('Formato incorrecto. Usa YYYY/YYYY');
    return;
  }
  if (porterosState.seasons.includes(value)) {
    showError('Esa temporada ya existe.');
    return;
  }
  setPorterosState({ seasons: [...porterosState.seasons, value] });
  renderHeader();
}
