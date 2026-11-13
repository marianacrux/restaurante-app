import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParamSchema } from '../../utils/validation.js';
import { createOrderSchema, listOrdersQuerySchema } from './order.validator.js';
import * as service from './order.service.js';

const router = Router();

router.use(authenticate); // TODAS las rutas de pedidos requieren sesión

// Consultar: personal operativo
router.get('/', authorize('ADMIN', 'CAJERO', 'COCINA'), validate({ query: listOrdersQuerySchema }), async (req, res) => {
  res.json(await service.listOrders(req.valid.query));
});

router.get('/:id', authorize('ADMIN', 'CAJERO', 'COCINA'), validate({ params: idParamSchema }), async (req, res) => {
  res.json(await service.getOrder(req.valid.params.id));
});

// Registrar pedidos manualmente (punto de venta, vitrina, domicilio telefónico)
router.post('/', authorize('ADMIN', 'CAJERO'), validate({ body: createOrderSchema }), async (req, res) => {
  res.status(201).json(await service.createOrder(req.valid.body, { userId: req.user.id }));
});

export default router;