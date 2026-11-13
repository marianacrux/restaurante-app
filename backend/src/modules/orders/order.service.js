import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { getDeliveryFee } from '../settings/setting.service.js';
import { buildOrderLines, computeTotal } from './order.pricing.js';

const userName = { select: { id: true, name: true } };

const detailInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  items: true,
  createdBy: userName,
  statusHistory: { include: { changedBy: userName }, orderBy: { createdAt: 'asc' } },
};

/**
 * Crea un pedido de cualquier canal.
 * @param input  datos ya validados por createOrderSchema
 * @param userId quién lo registra (null = el bot de WhatsApp)
 */
export async function createOrder(input, { userId = null } = {}) {
  const { customer, items, ...orderData } = input;

  const orderId = await prisma.$transaction(async (tx) => {
   
    const { lines, subtotal } = await buildOrderLines(tx, items);

    const deliveryFee = orderData.type === 'DOMICILIO' ? await getDeliveryFee(tx) : new Prisma.Decimal(0);

    const savedCustomer = customer
      ? await tx.customer.upsert({
          where: { phone: customer.phone },
          update: { name: customer.name },
          create: customer,
        })
      : null;

    const order = await tx.order.create({
      data: {
        ...orderData,
        status: 'CONFIRMADO',
        customerId: savedCustomer?.id ?? null,
        createdById: userId,
        subtotal,
        deliveryFee,
        total: computeTotal({ subtotal, deliveryFee }),
        items: { create: lines },
        statusHistory: {
          create: { previousStatus: null, newStatus: 'CONFIRMADO', changedById: userId, note: `Pedido creado (${orderData.source})` },
        },
      },
      select: { id: true },
    });
    return order.id;
  });

  return getOrder(orderId); 
}

export async function getOrder(id) {
  const order = await prisma.order.findUnique({ where: { id }, include: detailInclude });
  if (!order) throw AppError.notFound('Pedido no encontrado');
  return order;
}

export async function listOrders({ status, source, page, pageSize }) {
  const where = {
    ...(status && { status: { in: status } }),
    ...(source && { source }),
  };

  // Dos consultas juntas: cuántos hay en total y los de esta página
  const [total, data] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { customer: { select: { name: true, phone: true } }, items: { select: { productName: true, quantity: true, notes: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}