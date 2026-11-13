import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParamSchema } from '../../utils/validation.js';
import * as service from './order.service.js';
import { changeStatusSchema, createOrderSchema, listOrdersQuerySchema } from './order.validator.js';

const router = Router();

/** Agrega a un pedido los cambios de estado que el usuario actual puede hacer. */
const withActions = (order, user) => ({ ...order, availableStatuses: service.getAvailableStatuses(order, user.role) });

router.use(authenticate); // TODAS las rutas de pedidos requieren sesión

// Consultar: personal operativo
router.get('/', authorize('ADMIN', 'CAJERO', 'COCINA'), validate({ query: listOrdersQuerySchema }), async (req, res) => {
  const result = await service.listOrders(req.valid.query);
  res.json({ ...result, data: result.data.map((o) => withActions(o, req.user)) });
});

router.get('/:id', authorize('ADMIN', 'CAJERO', 'COCINA'), validate({ params: idParamSchema }), async (req, res) => {
  res.json(withActions(await service.getOrder(req.valid.params.id), req.user));
});

router.post('/', authorize('ADMIN', 'CAJERO'), validate({ body: createOrderSchema }), async (req, res) => {
  res.status(201).json(withActions(await service.createOrder(req.valid.body, { userId: req.user.id }), req.user));
});

// Historial de cambios
router.get('/:id/history', authorize('ADMIN', 'CAJERO', 'COCINA'), validate({ params: idParamSchema }), async (req, res) => {
  res.json(await service.getOrderHistory(req.valid.params.id));
});

// Cambiar estado (los permisos finos por estado los valida el servicio)
router.patch(
  '/:id/status',
  authorize('ADMIN', 'CAJERO', 'COCINA'),
  validate({ params: idParamSchema, body: changeStatusSchema }),
  async (req, res) => {
    res.json(withActions(await service.changeOrderStatus(req.valid.params.id, req.valid.body, req.user), req.user));
  },
);

export default router;