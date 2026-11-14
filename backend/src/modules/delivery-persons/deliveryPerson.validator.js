import { z } from 'zod';
import { TransportType } from '@prisma/client';
import { booleanQuery, phoneSchema, prismaEnum } from '../../utils/validation.js';

export const deliveryPersonBodySchema = z.object({
  name: z.string({ error: 'El nombre es obligatorio' }).trim().min(2, 'Nombre: mínimo 2 caracteres').max(120),
  phone: phoneSchema,
  transportType: prismaEnum(TransportType, 'Medio de transporte no válido'),
  userId: z.coerce.number().int().positive('Usuario inválido').nullish(),
});

// Al editar, todos los campos son opcionales y además se puede desactivar.
export const deliveryPersonUpdateSchema = deliveryPersonBodySchema.partial().extend({
  active: z.boolean({ error: 'active debe ser true o false' }).optional(),
});

// OCUPADO lo pone el sistema al despachar; a mano solo se alterna DISPONIBLE / INACTIVO.
export const availabilitySchema = z.object({
  availability: z.enum(['DISPONIBLE', 'INACTIVO'], { error: 'Disponibilidad: DISPONIBLE o INACTIVO' }),
});

export const deliveryPersonListQuerySchema = z.object({
  availability: z.enum(['DISPONIBLE', 'OCUPADO', 'INACTIVO'], { error: 'Disponibilidad no válida' }).optional(),
  includeInactive: booleanQuery.optional(),
});
