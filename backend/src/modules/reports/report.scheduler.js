// Programador: ejecuta el reporte automáticamente cada hora en punto (+10 s de margen
// para que entren los pedidos del último segundo). Usa setTimeout, sin dependencias extra.
import { prisma } from '../../config/prisma.js';
import { emitChange } from '../../realtime/socket.js';
import { runReport, startOfHour } from './report.service.js';

const HOUR_MS = 60 * 60 * 1000;
const MARGIN_MS = 10 * 1000;

let nextRunAt = null;
let timer = null;

export const isEnabled = () => process.env.REPORTS_ENABLED !== 'false';
export const getNextRunAt = () => nextRunAt;

async function runPreviousHour() {
  const previousHour = new Date(startOfHour().getTime() - HOUR_MS);
  const run = await runReport({ trigger: 'AUTOMATICO', periodStart: previousHour });
  emitChange(['reports']);
  console.log(`[reportes] Hora ${previousHour.toISOString()} → ${run.success ? 'Excel actualizado' : `ERROR: ${run.error}`}`);
}

function scheduleNext() {
  const next = startOfHour().getTime() + HOUR_MS + MARGIN_MS;
  nextRunAt = new Date(next);
  timer = setTimeout(async () => {
    try {
      await runPreviousHour();
    } catch (err) {
      console.error('[reportes] Falló el reporte automático:', err.message);
    }
    scheduleNext();
  }, next - Date.now());
  timer.unref(); // no impide que el proceso termine
}

/** Arranca el programador. Si el servidor estuvo apagado en la última hora en punto, la recupera. */
export async function startReportScheduler() {
  if (!isEnabled()) {
    console.log('[reportes] Reporte por hora desactivado (REPORTS_ENABLED=false)');
    return;
  }
  scheduleNext();
  try {
    const previousHour = new Date(startOfHour().getTime() - HOUR_MS);
    const done = await prisma.reportRun.findFirst({ where: { trigger: 'AUTOMATICO', success: true, periodStart: previousHour } });
    if (!done) await runPreviousHour();
  } catch (err) {
    console.error('[reportes] No se pudo recuperar la hora anterior:', err.message);
  }
  console.log(`[reportes] Próximo reporte automático: ${nextRunAt.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`);
}
