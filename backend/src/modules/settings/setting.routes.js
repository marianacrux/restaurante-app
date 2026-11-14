import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { getSettings, updateSettings } from './setting.service.js';

const router = Router();

const updateSchema = z
  .object({
    deliveryFee: z.coerce.number({ error: 'Costo inválido' }).int('Sin decimales').min(0, 'No puede ser negativo').max(1_000_000).optional(),
    restaurantName: z.string().trim().min(2, 'Mínimo 2 caracteres').max(80).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'No se envió ningún cambio');

// Lectura: el personal la necesita (p. ej. el cajero para mostrar el costo del domicilio)
router.get('/', authenticate, async (_req, res) => {
  res.json(await getSettings());
});

router.put('/', authenticate, authorize('ADMIN'), validate({ body: updateSchema }), async (req, res) => {
  res.json(await updateSettings(req.valid.body));
});

export default router;
