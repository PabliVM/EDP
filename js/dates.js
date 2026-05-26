// =============================================
// DATES.JS — Lógica de fechas y semanas
// Sin dependencias externas
// =============================================
const DAY_NAMES_ES    = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const DAY_NAMES_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

export function getMondayOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day === 0) ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function getWeekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function addWeeks(monday, n) {
  const d = new Date(monday);
  d.setDate(d.getDate() + n * 7);
  return d;
}

export function formatDate(date) {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function formatWeekRange(monday) {
  const sunday = addWeeks(monday, 1);
  sunday.setDate(sunday.getDate() - 1);
  const d1 = monday.getDate().toString().padStart(2, '0');
  const m1 = (monday.getMonth() + 1).toString().padStart(2, '0');
  const d2 = sunday.getDate().toString().padStart(2, '0');
  const m2 = (sunday.getMonth() + 1).toString().padStart(2, '0');
  const y  = sunday.getFullYear();
  return `${d1}/${m1} — ${d2}/${m2}/${y}`;
}

export function getWeekKey(monday) {
  const y  = monday.getFullYear();
  const wn = getWeekNumber(monday);
  return `${y}-W${wn.toString().padStart(2, '0')}`;
}

export function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export function toDateKey(date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getDayName(date) {
  return DAY_NAMES_ES[date.getDay()];
}

export function getDayNameShort(date) {
  return DAY_NAMES_SHORT[date.getDay()];
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

// Calcula microciclo usando startDate + startNumber del equipo
export function getMicroNumber(monday, seasonStartDate) {
  if (!seasonStartDate) return getWeekNumber(monday);
  const start = getMondayOfWeek(new Date(seasonStartDate));
  const diff  = Math.round((monday - start) / (7 * 24 * 3600 * 1000));
  return diff + 1;
}

// Calcula microciclo para un equipo concreto usando microciclos config
export function getMicroNumberForTeam(monday, teamKey, microciclos) {
  const cfg = microciclos?.[teamKey];
  if (!cfg?.startDate) return getMicroNumber(monday, null);
  const start       = getMondayOfWeek(new Date(cfg.startDate));
  const startNumber = cfg.startNumber ?? 1;
  const diff        = Math.round((monday - start) / (7 * 24 * 3600 * 1000));
  return startNumber + diff;
}


