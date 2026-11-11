import {Router} from 'express';
import {login} from './auth.service.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { loginSchema } from './auth.validator.js';
import { AppError } from '../../utils/AppError.js';

const router = Router();

router.post('/login', validate({ body: loginSchema }), async (req, res) => {
  const { email, password } = req.valid.body; // ya validados y normalizados
  const result = await login(email, password);
  if (!result) throw AppError.unauthorized('Correo o contraseña incorrectos');
  res.json(result);
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});


export default router;


