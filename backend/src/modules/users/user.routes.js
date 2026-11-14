import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParamSchema } from '../../utils/validation.js';
import * as service from './user.service.js';
import { createUserSchema, updateUserSchema } from './user.validator.js';

// Gestión de usuarios: solo el administrador.
const router = Router();
router.use(authenticate, authorize('ADMIN'));

router.get('/', async (req, res) => {
  res.json(await service.listUsers());
});

router.post('/', validate({ body: createUserSchema }), async (req, res) => {
  res.status(201).json(await service.createUser(req.valid.body));
});

router.put('/:id', validate({ params: idParamSchema, body: updateUserSchema }), async (req, res) => {
  res.json(await service.updateUser(req.valid.params.id, req.valid.body, req.user));
});

export default router;
