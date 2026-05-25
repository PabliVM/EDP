// ================================================
// PORTEROS-STATE.JS — Estado UI en memoria
// Solo vive mientras la página está abierta.
// NUNCA se guarda en localStorage ni similar.
// ================================================

import { getMondayOfWeek } from './dates.js';

const _state = {
  activeTeam:    null,
  activeSeason:  null,
  allSeasons:    [],
  seasons:       [],
  currentMonday: getMondayOfWeek(new Date()),
  currentView:   'inicio',
  darkMode:      false,
  icons:         null,
  microciclos:   {},
  conceptos:     {},
};

export const porterosState = _state;

export function setPorterosState(patch) {
  Object.assign(_state, patch);
}
