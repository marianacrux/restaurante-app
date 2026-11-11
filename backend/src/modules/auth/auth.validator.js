import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ error: 'El correo es obligatorio' })
    .trim()
    .toLowerCase()
    .pipe(z.email('Correo inválido')),
  password: z.string({ error: 'La contraseña es obligatoria' }).min(1, 'La contraseña es obligatoria'),
});