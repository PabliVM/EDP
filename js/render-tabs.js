// ================================================
// RENDER-TABS.JS — Pestañas
// ================================================

import { porterosState, setPorterosState } from './porteros-state.js';
import { TABS } from './constants.js';

export function renderTabs() {
  const nav = document.getElementById('rm-tabs');
  if (!nav) return;

  nav.innerHTML = TABS.map(tab => `
    <button
      class="tab-btn ${porterosState.activeTab === tab.key ? 'active' : ''}"
      data-tab="${tab.key}">
      ${tab.label}
    </button>
  `).join('');

  nav.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

export function switchTab(tabKey) {
  if (porterosState.activeTab === tabKey) return;
  setPorterosState({ activeTab: tabKey });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabKey);
  });

  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('hidden', panel.dataset.tab !== tabKey);
  });

  document.dispatchEvent(new CustomEvent('rm:tab-changed', { detail: tabKey }));
}
