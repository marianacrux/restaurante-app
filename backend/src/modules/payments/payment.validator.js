import { z } from 'zod';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { priceSchema, prismaEnum } from '../../utils/validation.js';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha: AAAA-MM-DD');

export const createPaymentSchema = z.object({
  orderId: z.coerce.number({ error: 'Pedido inválido' }).int().positive('Pedido inválido'),
  method: prismaEnum(PaymentMethod, 'Método de pago no válido'),
  amount: priceSchema, // mismo control que los precios: positivo y máximo 2 decimales
  reference: z.string().trim().max(100).nullish(),
  notes: z.string().trim().max(300).nullish(),
});

export const refundSchema = z.object({
  status: z.literal('REEMBOLSADO', { error: 'Solo se admite status REEMBOLSADO' }),
  notes: z.string({ error: 'Indique el motivo del reembolso' }).trim().min(3, 'Indique el motivo del reembolso').max(300),
});

export const listPaymentsQuerySchema = z
  .object({
    method: prismaEnum(PaymentMethod, 'Método de pago no válido').optional(),
    status: prismaEnum(PaymentStatus, 'Estado de pago no válido').optional(),
    orderId: z.coerce.number().int().positive().optional(),
    from: day.optional(),
    to: day.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(30),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { path: ['from'], message: '"from" debe ser anterior a "to"' });
