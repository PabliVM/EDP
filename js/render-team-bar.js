// ================================================
// RENDER-TEAM-BAR.JS
// ================================================

import { PORTEROS_TEAMS }            from './porteros-constants.js';
import { porterosState, setPorterosState } from './porteros-state.js';

export function renderTeamBar() {
  const container = document.getElementById('rm-team-bar');
  if (!container) return;

  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;align-items:center;height:100%;padding:0 12px;gap:6px;';

  PORTEROS_TEAMS.forEach(team => {
    const btn = document.createElement('button');
    btn.className = 'team-btn' + (porterosState.activeTeam === team.key ? ' active' : '');
    btn.textContent = team.label;
    btn.title = team.full;
    btn.dataset.team = team.key;
    btn.addEventListener('click', () => selectTeam(team.key));
    bar.appendChild(btn);
  });

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
