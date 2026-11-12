import { z } from 'zod';
import { booleanQuery, imageUrlSchema, priceSchema } from '../../utils/validation.js';

export const productBodySchema = z.object({
  name: z.string({ error: 'El nombre es obligatorio' }).trim().min(2, 'Mínimo 2 caracteres').max(120),
  description: z.string().trim().max(500).nullish(),
  price: priceSchema,
  imageUrl: imageUrlSchema.nullish(),
  categoryId: z.coerce.number({ error: 'Seleccione una categoría' }).int().positive('Seleccione una categoría'),
  available: z.boolean().optional(),
  isDailyMenu: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const productUpdateSchema = productBodySchema.partial();

export const availabilitySchema = z.object({
  available: z.boolean({ error: 'available debe ser true o false' }),
});

export const productListQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  available: booleanQuery.optional(),
  dailyMenu: booleanQuery.optional(),
  search: z.string().trim().max(80).optional(),
  includeInactive: booleanQuery.optional(),
});