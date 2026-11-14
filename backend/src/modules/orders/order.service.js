import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { getDeliveryFee } from '../settings/setting.service.js';
import { buildOrderLines, computeTotal } from './order.pricing.js';
import { DELIVERY_ONLY_STATUSES, ROLE_ALLOWED_TARGETS, STATUS_TRANSITIONS } from './order.constants.js';
import { cancelActiveDelivery } from '../deliveries/delivery.helpers.js';

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

export async function listOrders({ status, source, type, paymentStatus, page, pageSize }) {
  const where = {
    ...(status && { status: { in: status } }),
    ...(source && { source }),
    ...(type && { type }),
    ...(paymentStatus && { paymentStatus: { in: paymentStatus } }),
  };

  // Dos consultas juntas: cuántos hay en total y los de esta página
  const [total, data] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true } },
        items: { select: { productName: true, quantity: true, notes: true } },
        payments: { where: { status: 'PAGADO' }, select: { amount: true } }, // para calcular el saldo
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}


/**
 * Estados a los que el rol puede llevar ESTE pedido.
 * El frontend dibujará sus botones con esto: las reglas viven solo aquí.
 */
export function getAvailableStatuses(order, role) {
  const roleTargets = ROLE_ALLOWED_TARGETS[role] ?? [];
  return (STATUS_TRANSITIONS[order.status] ?? []).filter(
    (s) =>
      roleTargets.includes(s) &&
      !(order.type === 'DOMICILIO' && DELIVERY_ONLY_STATUSES.includes(s)) &&
      !(order.type !== 'DOMICILIO' && s === 'EN_CAMINO'),
  );
}

/**
 * Cambia el estado de un pedido validando la máquina de estados y el rol.
 */
export async function changeOrderStatus(id, { status, note, cancelReason }, user) {
  if (!(ROLE_ALLOWED_TARGETS[user.role] ?? []).includes(status)) {
    throw AppError.forbidden(`El rol ${user.role} no puede cambiar pedidos a ${status}`);
  }

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, select: { id: true, status: true, type: true } });
    if (!order) throw AppError.notFound('Pedido no encontrado');

    if (order.type === 'DOMICILIO' && DELIVERY_ONLY_STATUSES.includes(status)) {
      throw AppError.conflict('En pedidos a domicilio este estado se cambia desde el módulo de domicilios');
    }
    if (order.type !== 'DOMICILIO' && status === 'EN_CAMINO') {
      throw AppError.conflict('Solo los pedidos a domicilio pueden estar EN_CAMINO');
    }

    await transitionOrderStatus(tx, order, status, { userId: user.id, note, cancelReason });
    // Un pedido cancelado mientras iba en camino libera a su domiciliario.
    if (status === 'CANCELADO') await cancelActiveDelivery(tx, order.id);
  });

  return getOrder(id);
}


/**
 * Bloque reutilizable (lo usará también el módulo de domicilios en la Fase 10):
 * valida la transición, cambia el estado con control de concurrencia y registra el historial.
 */
export async function transitionOrderStatus(tx, order, newStatus, { userId = null, note, cancelReason } = {}) {
  const allowed = STATUS_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw AppError.conflict(`No se puede pasar de ${order.status} a ${newStatus}`);
  }

  // Solo actualiza si el pedido SIGUE en el estado que leímos (concurrencia optimista)
  const { count } = await tx.order.updateMany({
    where: { id: order.id, status: order.status },
    data: { status: newStatus, ...(newStatus === 'CANCELADO' && { cancelReason }) },
  });
  if (count === 0) throw AppError.conflict('El pedido fue modificado por otro usuario. Recargue e intente de nuevo');

  await tx.orderStatusHistory.create({
    data: {
      orderId: order.id,
      previousStatus: order.status,
      newStatus,
      changedById: userId,
      note: newStatus === 'CANCELADO' ? `Cancelado: ${cancelReason}` : note,
    },
  });
}

export async function getOrderHistory(id) {
  await getOrder(id); 
  return prisma.orderStatusHistory.findMany({
    where: { orderId: id },
    include: { changedBy: userName },
    orderBy: { createdAt: 'asc' },
  });
}