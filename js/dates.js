export function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addWeeks(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount * 7);
  return getMonday(d);
}

export function buildWeekDays(mondayDate) {
  const names = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO", "DOMINGO"];

  return names.map((name, index) => {
    const d = new Date(mondayDate);
    d.setDate(d.getDate() + index);

    return {
      name,
      date: d,
      dayNumber: d.getDate(),
      dateKey: d.toISOString().slice(0, 10)
    };
  });
}

export function getWeekId(mondayDate) {
  return mondayDate.toISOString().slice(0, 10);
}
