// ================================================
// PORTEROS-STATE.JS — Estado UI en memoria
// Solo vive mientras la página está abierta.
// NUNCA se guarda en localStorage ni similar.
// ================================================

import { getMondayOfWeek } from './dates.js';

const _state = {
  activeTeam:    'JA',
  activeSeason:  null,
  currentMonday: getMondayOfWeek(new Date()),
  activeTab:     'semana',
  icons:         null,
  darkMode:      false,
};

export const porterosState = _state;

export function setPorterosState(patch) {
  Object.assign(_state, patch);
}
