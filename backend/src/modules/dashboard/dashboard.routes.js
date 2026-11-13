import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import * as service from './dashboard.service.js';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha: AAAA-MM-DD');

const router = Router();
router.use(authenticate, authorize('ADMIN', 'CAJERO'));

// GET /api/dashboard/summary?date=2026-11-13  (sin date = hoy)
router.get('/summary', validate({ query: z.object({ date: day.optional() }) }), async (req, res) => {
  res.json(await service.getSummary(req.valid.query.date));
});

// GET /api/dashboard/sales?from=2026-11-07&to=2026-11-13  (sin fechas = últimos 7 días)
router.get(
  '/sales',
  validate({
    query: z
      .object({ from: day.optional(), to: day.optional() })
      .refine((q) => !q.from || !q.to || q.from <= q.to, { message: '"from" debe ser anterior o igual a "to"', path: ['from'] }),
  }),
  async (req, res) => {
    res.json(await service.getSalesByDay(req.valid.query));
  },
);

export default router;