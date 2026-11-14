import { Router } from 'express';
import path from 'node:path';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { AppError } from '../../utils/AppError.js';
import { fileExists, listRuns, REPORT_PATH, runReport, startOfHour } from './report.service.js';
import { getNextRunAt, isEnabled } from './report.scheduler.js';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

// Estado del programador + historial de ejecuciones
router.get('/', async (_req, res) => {
  res.json({
    enabled: isEnabled(),
    nextRunAt: getNextRunAt(),
    filePath: REPORT_PATH,
    fileName: path.basename(REPORT_PATH),
    file: await fileExists(),
    runs: await listRuns(),
  });
});

// Generar ya: actualiza la fila de la hora en curso (la automática la completará al cerrar la hora)
router.post('/run', async (_req, res) => {
  const run = await runReport({ trigger: 'MANUAL', periodStart: startOfHour() });
  if (!run.success) throw AppError.conflict(run.error);
  res.status(201).json(run);
});

// Descargar el Excel
router.get('/download', async (_req, res) => {
  const { exists } = await fileExists();
  if (!exists) throw AppError.notFound('Todavía no se ha generado ningún reporte');
  res.download(REPORT_PATH, path.basename(REPORT_PATH));
});

export default router;
