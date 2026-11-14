// Rutas para CLIENTES (sin cuenta): seguimiento de su pedido.
// Para evitar que alguien consulte pedidos ajenos se pide el número de pedido
// Y el celular con el que se hizo. Solo se devuelve información no sensible.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../utils/AppError.js';
import { phoneSchema } from '../../utils/validation.js';
import { getRestaurantName } from '../settings/setting.service.js';

const router = Router();

const params = z.object({ orderNumber: z.coerce.number({ error: 'Número de pedido inválido' }).int().positive('Número de pedido inválido') });
const query = z.object({ phone: phoneSchema });

router.get('/orders/:orderNumber', validate({ params, query }), async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { orderNumber: req.valid.params.orderNumber },
    select: {
      orderNumber: true,
      status: true,
      type: true,
      total: true,
      deliveryFee: true,
      paymentStatus: true,
      createdAt: true,
      updatedAt: true,
      customer: { select: { name: true, phone: true } },
      items: { select: { productName: true, quantity: true, notes: true, subtotal: true } },
      statusHistory: { select: { newStatus: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
    },
  });
  // Mismo mensaje si no existe o si el celular no coincide (no revela qué pedidos existen)
  if (!order || order.customer?.phone !== req.valid.query.phone) {
    throw AppError.notFound('No encontramos un pedido con ese número y celular');
  }
  const { customer, ...rest } = order;
  res.json({ ...rest, customerName: customer.name.split(' ')[0], restaurantName: await getRestaurantName() });
});

export default router;
