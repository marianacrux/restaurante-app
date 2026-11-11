import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce
    .number({ error: 'El id debe ser numérico' })
    .int()
    .positive('El id debe ser un número positivo'),
});

export const booleanQuery = z.enum(['true', 'false']).transform((v) => v === 'true');