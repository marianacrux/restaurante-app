import { z } from 'zod';
import { Role } from '@prisma/client';
import { prismaEnum } from '../../utils/validation.js';

const password = z
  .string({ error: 'La contraseña es obligatoria' })
  .min(8, 'La contraseña debe tener mínimo 8 caracteres')
  .max(72, 'Máximo 72 caracteres')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Debe tener letras y números');

export const createUserSchema = z.object({
  name: z.string({ error: 'El nombre es obligatorio' }).trim().min(2, 'Mínimo 2 caracteres').max(120),
  email: z.email('Correo inválido').trim().toLowerCase(),
  role: prismaEnum(Role, 'Rol no válido'),
  password,
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(120).optional(),
  email: z.email('Correo inválido').trim().toLowerCase().optional(),
  role: prismaEnum(Role, 'Rol no válido').optional(),
  active: z.boolean().optional(),
  password: password.optional(), // si viene, se cambia la contraseña
});
