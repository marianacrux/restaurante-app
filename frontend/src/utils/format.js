// Formatos para Colombia. El backend envía el dinero como texto ("47000").
const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export const formatMoney = (value) => money.format(Number(value ?? 0));

export const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' });

/** 'AAAA-MM-DD' de hoy en Bogotá. */
export const todayLocal = () => new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** '2026-11-12' → 'jue 12' */
export const formatShortDay = (day) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('es-CO', { timeZone: 'UTC', weekday: 'short', day: 'numeric' });