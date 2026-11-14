import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParamSchema } from '../../utils/validation.js';
import * as service from './deliveryPerson.service.js';
import {
  availabilitySchema,
  deliveryPersonBodySchema,
  deliveryPersonListQuerySchema,
  deliveryPersonUpdateSchema,
} from './deliveryPerson.validator.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize('ADMIN', 'CAJERO'), validate({ query: deliveryPersonListQuerySchema }), async (req, res) => {
  res.json(await service.listDeliveryPersons(req.valid.query));
});

router.post('/', authorize('ADMIN'), validate({ body: deliveryPersonBodySchema }), async (req, res) => {
  res.status(201).json(await service.createDeliveryPerson(req.valid.body));
});

router.put('/:id', authorize('ADMIN'), validate({ params: idParamSchema, body: deliveryPersonUpdateSchema }), async (req, res) => {
  res.json(await service.updateDeliveryPerson(req.valid.params.id, req.valid.body));
});

router.patch(
  '/:id/availability',
  authorize('ADMIN', 'CAJERO'),
  validate({ params: idParamSchema, body: availabilitySchema }),
  async (req, res) => {
    res.json(await service.setAvailability(req.valid.params.id, req.valid.body.availability));
  },
);

export default router;
