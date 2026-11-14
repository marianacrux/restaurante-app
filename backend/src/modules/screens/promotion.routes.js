import { Router } from 'express';
import { z } from 'zod';
import { DiscountType } from '@prisma/client';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParamSchema, imageUrlSchema, prismaEnum } from '../../utils/validation.js';
import { createPromotion, listPromotions, updatePromotion } from './screen.service.js';

const baseSchema = z.object({
  name: z.string({ error: 'El nombre es obligatorio' }).trim().min(3, 'Mínimo 3 caracteres').max(120),
  description: z.string().trim().max(300).nullish(),
  discountType: prismaEnum(DiscountType, 'Tipo de descuento no válido'),
  discountValue: z.coerce.number({ error: 'Valor del descuento inválido' }).positive('El descuento debe ser mayor que cero'),
  productId: z.coerce.number().int().positive().nullish(),
  imageUrl: imageUrlSchema.nullish(),
  startDate: z.coerce.date({ error: 'Fecha de inicio inválida' }),
  endDate: z.coerce.date({ error: 'Fecha de fin inválida' }),
  active: z.boolean().optional(),
});

const rules = (p, ctx) => {
  if (p.discountType === 'PORCENTAJE' && p.discountValue > 100) {
    ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'Un porcentaje no puede superar 100' });
  }
  if (p.startDate && p.endDate && p.endDate <= p.startDate) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'La fecha de fin debe ser posterior al inicio' });
  }
};

const createSchema = baseSchema.superRefine(rules);
const updateSchema = baseSchema.partial().superRefine(rules);

const router = Router();
router.use(authenticate);

router.get('/', authorize('ADMIN', 'CAJERO'), async (_req, res) => {
  res.json(await listPromotions());
});

router.post('/', authorize('ADMIN'), validate({ body: createSchema }), async (req, res) => {
  res.status(201).json(await createPromotion(req.valid.body));
});

// Para "eliminar" se envía { active: false }: se conserva para el historial de pantallas.
router.put('/:id', authorize('ADMIN'), validate({ params: idParamSchema, body: updateSchema }), async (req, res) => {
  res.json(await updatePromotion(req.valid.params.id, req.valid.body));
});

export default router;
