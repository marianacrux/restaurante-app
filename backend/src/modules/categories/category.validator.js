import { z } from 'zod';
import { booleanQuery } from '../../utils/validation.js';

export const categoryBodySchema = z.object({
  name: z.string({ error: 'El nombre es obligatorio' }).trim().min(2, 'Mínimo 2 caracteres').max(80),
  description: z.string().trim().max(300).nullish(),
  position: z.coerce.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

// Para editar los mismos campos, pero todos opcionales (se envía solo lo que cambia)
export const categoryUpdateSchema = categoryBodySchema.partial();

export const categoryListQuerySchema = z.object({
  includeInactive: booleanQuery.optional(),
});