import { Router } from 'express';
import { authenticate, authorize, optionalAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParamSchema } from '../../utils/validation.js';
import { availabilitySchema, productBodySchema, productListQuerySchema, productUpdateSchema } from './product.validator.js';
import * as service from './product.service.js';

const router = Router();
const byId = { params: idParamSchema };
const isAdmin = (req) => req.user?.role === 'ADMIN';

router.get('/', optionalAuth, validate({ query: productListQuerySchema }), async (req, res) => {
  const filters = { ...req.valid.query, includeInactive: Boolean(req.valid.query.includeInactive && isAdmin(req)) };
  res.json(await service.listProducts(filters));
});

router.get('/:id', optionalAuth, validate(byId), async (req, res) => {
  res.json(await service.getProduct(req.valid.params.id, { includeInactive: isAdmin(req) }));
});

// Gestión del catálogo solo para ADMIN
router.post('/', authenticate, authorize('ADMIN'), validate({ body: productBodySchema }), async (req, res) => {
  res.status(201).json(await service.createProduct(req.valid.body));
});

router.put('/:id', authenticate, authorize('ADMIN'), validate({ ...byId, body: productUpdateSchema }), async (req, res) => {
  res.json(await service.updateProduct(req.valid.params.id, req.valid.body));
});

router.delete('/:id', authenticate, authorize('ADMIN'), validate(byId), async (req, res) => {
  res.json(await service.deactivateProduct(req.valid.params.id));
});

// Marcar agotado
router.patch(
  '/:id/availability',
  authenticate,
  authorize('ADMIN', 'CAJERO', 'COCINA'),
  validate({ ...byId, body: availabilitySchema }),
  async (req, res) => {
    res.json(await service.setAvailability(req.valid.params.id, req.valid.body.available));
  },
);

export default router;