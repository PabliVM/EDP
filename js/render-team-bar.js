// ================================================
// RENDER-TEAM-BAR.JS
// ================================================
import { PORTEROS_TEAMS, PORTERO_TEAM } from './porteros-constants.js';
import { porterosState, setPorterosState } from './porteros-state.js';

export function renderTeamBar() {
  const container = document.getElementById('rm-team-bar');
  if (!container) return;

  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;align-items:center;height:100%;padding:0 12px;gap:6px;';

  // Equipos normales
  PORTEROS_TEAMS.forEach(team => {
    const btn = document.createElement('button');
    btn.className = 'team-btn' + (porterosState.activeTeam === team.key ? ' active' : '');
    btn.textContent = team.label;
    btn.title = team.full;
    btn.dataset.team = team.key;
    btn.addEventListener('click', () => selectTeam(team.key));
    bar.appendChild(btn);
  });

  // Separador visual
  const sep = document.createElement('div');
  sep.style.cssText = 'width:1px;height:20px;background:var(--border-default);margin:0 4px;flex-shrink:0;';
  bar.appendChild(sep);

  // Botón PORTERO especial
  const btnPortero = document.createElement('button');
  btnPortero.className = 'team-btn team-btn-portero' +
    (porterosState.activeTeam === PORTERO_TEAM.key ? ' active' : '');
  btnPortero.textContent = PORTERO_TEAM.label;
  btnPortero.title = 'Planificación individual de portero';
  btnPortero.dataset.team = PORTERO_TEAM.key;
  btnPortero.addEventListener('click', () => selectTeam(PORTERO_TEAM.key));
  bar.appendChild(btnPortero);

  container.innerHTML = '';
  container.appendChild(bar);
}

function selectTeam(teamKey) {
  if (porterosState.activeTeam === teamKey) return;
  setPorterosState({ activeTeam: teamKey });
  document.querySelectorAll('.team-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.team === teamKey);
  });
  document.dispatchEvent(new CustomEvent('porteros:team-changed', { detail: teamKey }));
}

