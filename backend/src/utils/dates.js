// Fechas del negocio en hora de Colombia (UTC−5, sin horario de verano).
// La base de datos guarda las horas en UTC: "hoy" en Bogotá no coincide con "hoy" en UTC.
const OFFSET = '-05:00';
const DAY_MS = 24 * 60 * 60 * 1000;

/** 'AAAA-MM-DD' de hoy en Bogotá. */
export function todayLocal() {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Inicio (incluido) y fin (excluido) en UTC de un día de Bogotá. */
export function localDayRange(day = todayLocal()) {
  const start = new Date(`${day}T00:00:00${OFFSET}`);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** Suma (o resta) días a una fecha 'AAAA-MM-DD'. */
export function addDays(day, n) {
  return new Date(new Date(`${day}T12:00:00Z`).getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

/** Lista de días 'AAAA-MM-DD' desde "from" hasta "to" (ambos incluidos). */
export function listDays(from, to) {
  const days = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}