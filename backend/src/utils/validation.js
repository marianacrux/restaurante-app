import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce
    .number({ error: 'El id debe ser numérico' })
    .int()
    .positive('El id debe ser un número positivo'),
});

export const booleanQuery = z
  .enum(['true', 'false'], { error: 'Use true o false' })
  .transform((v) => v === 'true');

/** Dinero: */
export const priceSchema = z.coerce
  .number({ error: 'El precio debe ser un número' })
  .positive('El precio debe ser mayor que cero')
  .max(99_999_999, 'Precio demasiado alto')
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(String(v)), 'Máximo 2 decimales');

/** URL http(s) o ruta local (/uploads/...). Preparado para un almacenamiento externo en el futuro. */
export const imageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^https?:\/\/\S+$/.test(v) || v.startsWith('/'), 'Debe ser una URL http(s) o una ruta local');