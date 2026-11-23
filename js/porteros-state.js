// ================================================
// PORTEROS-STATE.JS — Estado UI en memoria
// Solo vive mientras la página está abierta.
// NUNCA se guarda en localStorage ni similar.
// ================================================

import { getMondayOfWeek } from './dates.js';
import { DAY_TYPES }       from './porteros-constants.js';

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
  mesociclosF7:  {},
  currentMeso:   null,
  dayTypes:      null,
};

export const porterosState = _state;

export function setPorterosState(patch) {
  Object.assign(_state, patch);
}

// Tipos de día: configurables desde Firestore (porteros_config/tipos_dia).
// Si no hay config, se usan los DAY_TYPES por defecto.
export function getDayTypes() {
  return _state.dayTypes?.length ? _state.dayTypes : DAY_TYPES;
}

export function getDayTypeLabel(key) {
  return getDayTypes().find(dt => dt.key === key)?.label
      || DAY_TYPES.find(dt => dt.key === key)?.label
      || key;
}
