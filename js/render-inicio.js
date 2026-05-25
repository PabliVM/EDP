// ================================================
// RENDER-INICIO.JS — Página de inicio
// ================================================

import { PORTEROS_TEAMS }                  from './porteros-constants.js';
import { porterosState, setPorterosState } from './porteros-state.js';

export function renderInicio() {
  const panel = document.getElementById('tab-semana');
  if (!panel) return;

  panel.innerHTML = `
    <div class="inicio-hero">
      <img src="./rm.png" alt="RM" class="inicio-logo" />
      <div class="inicio-title">Coordinación EDP</div>
      <div class="inicio-subtitle">Selecciona un equipo para gestionar su planificación</div>
    </div>

    <div class="equipos-section">
      <div class="equipos-label">EQUIPOS</div>
      <div class="equipos-grid" id="equipos-grid"></div>
    </div>
  `;

  renderEquiposGrid();
}

function renderEquiposGrid() {
  const grid = document.getElementById('equipos-grid');
  if (!grid) return;

  PORTEROS_TEAMS.forEach(team => {
    const card = document.createElement('div');
    card.className = 'equipo-card' + (porterosState.activeTeam === team.key ? ' active' : '');
    card.innerHTML = `
      <div class="equipo-card-key">${team.label}</div>
      <div class="equipo-card-full">${team.full}</div>
    `;
    card.addEventListener('click', () => selectEquipo(team.key));
    grid.appendChild(card);
  });
}

function selectEquipo(teamKey) {
  setPorterosState({ activeTeam: teamKey });

  document.querySelectorAll('.equipo-card').forEach(card => {
    card.classList.toggle('active', card.querySelector('.equipo-card-key').textContent === teamKey);
  });

  document.querySelectorAll('.team-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.team === teamKey);
  });

  document.dispatchEvent(new CustomEvent('porteros:team-changed', { detail: teamKey }));
}
