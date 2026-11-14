import { Router } from 'express';
import { login } from './auth.service.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { clearLoginFailures, loginLimiter, registerLoginFailure } from '../../middlewares/loginLimiter.js';
import { loginSchema } from './auth.validator.js';
import { AppError } from '../../utils/AppError.js';

const router = Router();

router.post('/login', loginLimiter, validate({ body: loginSchema }), async (req, res) => {
  const { email, password } = req.valid.body; // ya validados y normalizados
  const result = await login(email, password);
  if (!result) {
    const left = registerLoginFailure(req);
    // Mismo mensaje para correo inexistente y contraseña mala: no revela qué correos existen.
    throw left > 0
      ? AppError.unauthorized(`Correo o contraseña incorrectos${left <= 2 ? `. Te quedan ${left} intentos` : ''}`)
      : AppError.tooManyRequests('Demasiados intentos fallidos. Intente de nuevo en 15 min.');
  }
  clearLoginFailures(req);
  res.json(result);
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
