import {Router} from 'express';
import {login} from './auth.service.js';
import { authenticate, authorize } from '../../middlewares/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
  }

    const result = await login(email.trim().toLowerCase(), password);
    if (!result) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }
    res.json(result);
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

router.get('/solo-admin', authenticate, authorize('ADMIN'), (req, res) => {
  res.json({ message: `Hola ${req.user.name}: eres administrador` });
});

export default router;


