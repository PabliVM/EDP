// ================================================
// PORTEROS-CONSTANTS.JS
// ================================================
export const PORTEROS_TEAMS = [
  { key: 'CAS', label: 'CAS', full: 'Castilla'      },
  { key: 'RMC', label: 'RMC', full: 'Real Madrid C'  },
  { key: 'JA',  label: 'JA',  full: 'Juvenil A'      },
  { key: 'JB',  label: 'JB',  full: 'Juvenil B'      },
  { key: 'JC',  label: 'JC',  full: 'Juvenil C'      },
  { key: 'CA',  label: 'CA',  full: 'Cadete A'        },
  { key: 'CB',  label: 'CB',  full: 'Cadete B'        },
  { key: 'IA',  label: 'IA',  full: 'Infantil A'      },
  { key: 'IB',  label: 'IB',  full: 'Infantil B'      },
  { key: 'AA',  label: 'AA',  full: 'Alevín A'        },
  { key: 'F7',  label: 'F7',  full: 'Fútbol 7'        },
];

// Equipo especial portero individual — separado para no mezclarse con equipos normales
export const PORTERO_TEAM = { key: 'PORTERO', label: 'PORTERO', full: 'Portero' };

export const DAY_TYPES = [
  { key: 'entrenamiento', label: 'Entrenamiento',       badge: 'badge-blue' },
  { key: 'partido',       label: 'Partido',             badge: 'badge-gold' },
  { key: 'descanso',      label: 'Descanso',            badge: 'badge-gray' },
  { key: 'torneo',        label: 'Torneo',              badge: 'badge-gray' },
  { key: 'libre',         label: 'Libre / Sin definir', badge: 'badge-gray' },
];

export const BLOCK_TYPES = [
  { key: 'preparacion_fisica',  label: 'Preparación Física',      iconKey: 'preparacionFisica'  },
  { key: 'entrenamiento_campo', label: 'Entrenamiento en Campo',   iconKey: 'entrenamientoCampo' },
  { key: 'video_analisis',      label: 'Video análisis',           iconKey: 'videoAnalisis'      },
  { key: 'informe_micro',       label: 'Informe contenidos micro', iconKey: 'informeMicro'       },
];

export const INTENSIDADES   = ['ALTA', 'MEDIA', 'BAJA'];
export const IMPACTOS       = ['ALTA', 'MEDIA', 'BAJA'];

export const STATUS_OPTIONS = [
  { key: 'borrador',    label: 'Borrador'    },
  { key: 'provisional', label: 'Provisional' },
  { key: 'definitivo',  label: 'Definitivo'  },
];

export const PORTEROS_ICONS = {
  logo:               './rm.png',
  preparacionFisica:  './assets/icons/brazo.png',
  entrenamientoCampo: './assets/icons/balon.png',
  videoAnalisis:      './assets/icons/video.png',
  informeMicro:       './assets/icons/informe.png',
};

export const FIREBASE_COLLECTIONS = {
  SEASONS:   'porteros_seasons',
  WEEKS:     'porteros_weeks',
  DAY_PLANS: 'porteros_day_plans',
  CONFIG:    'porteros_config',
};

export const DAY_NAMES_ES = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
];

