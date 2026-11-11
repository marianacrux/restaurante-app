import { Router } from 'express';
import { authenticate, authorize, optionalAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParamSchema } from '../../utils/validation.js';
import { categoryBodySchema, categoryListQuerySchema, categoryUpdateSchema } from './category.validator.js';
import { createCategory, listCategories, updateCategory } from './category.service.js';

const router = Router();

router.get('/', optionalAuth, validate({ query: categoryListQuerySchema }), async (req, res) => {
  const includeInactive = Boolean(req.valid.query.includeInactive && req.user?.role === 'ADMIN');
  res.json(await listCategories({ includeInactive }));
});

router.post('/', authenticate, authorize('ADMIN'), validate({ body: categoryBodySchema }), async (req, res) => {
  res.status(201).json(await createCategory(req.valid.body)); 
});

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate({ params: idParamSchema, body: categoryUpdateSchema }),
  async (req, res) => {
    res.json(await updateCategory(req.valid.params.id, req.valid.body));
  },
);

export default router;