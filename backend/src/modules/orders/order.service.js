import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { getDeliveryFee } from '../settings/setting.service.js';
import { buildOrderLines, computeTotal } from './order.pricing.js';
import { DELIVERY_ONLY_STATUSES, ROLE_ALLOWED_TARGETS, STATUS_TRANSITIONS } from './order.constants.js';
import { cancelActiveDelivery } from '../deliveries/delivery.helpers.js';
import { recomputeOrderPaymentStatus } from '../payments/payment.service.js';

const userName = { select: { id: true, name: true } };

const detailInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  items: true,
  createdBy: userName,
  statusHistory: { include: { changedBy: userName }, orderBy: { createdAt: 'asc' } },
  payments: { include: { recordedBy: userName }, orderBy: { createdAt: 'asc' } },
  delivery: { include: { deliveryPerson: { select: { id: true, name: true, phone: true } } } },
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

const EDITABLE_ITEMS = ['PENDIENTE', 'CONFIRMADO']; // cuando cocina empieza, ya no se agregan productos
const CLOSED = ['ENTREGADO', 'CANCELADO'];

/** Agrega productos a un pedido y recalcula subtotal, total y estado de pago (todo en el servidor). */
export async function addItems(id, items, user) {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`; // nadie más lo modifica mientras tanto
    const order = await tx.order.findUnique({ where: { id }, select: { id: true, status: true, discount: true, deliveryFee: true } });
    if (!order) throw AppError.notFound('Pedido no encontrado');
    if (!EDITABLE_ITEMS.includes(order.status)) {
      throw AppError.conflict(`Solo se agregan productos a pedidos pendientes o confirmados (este está ${order.status})`);
    }

    const { lines } = await buildOrderLines(tx, items);
    await tx.orderItem.createMany({ data: lines.map((l) => ({ ...l, orderId: id })) });

    const agg = await tx.orderItem.aggregate({ where: { orderId: id }, _sum: { subtotal: true } });
    const subtotal = agg._sum.subtotal ?? new Prisma.Decimal(0);
    await tx.order.update({
      where: { id },
      data: { subtotal, total: computeTotal({ subtotal, discount: order.discount, deliveryFee: order.deliveryFee }) },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: id,
        previousStatus: order.status,
        newStatus: order.status,
        changedById: user.id,
        note: `Productos agregados: ${lines.map((l) => `${l.quantity} ${l.productName}`).join(', ')}`,
      },
    });
    await recomputeOrderPaymentStatus(tx, id); // si estaba PAGADO, ahora puede quedar PARCIAL
  });
  return getOrder(id);
}

/** Cambia datos permitidos: notas, dirección, método de pago elegido, datos del cliente. */
export async function updateOrderInfo(id, { customer, ...data }, user) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, select: { id: true, status: true, type: true } });
    if (!order) throw AppError.notFound('Pedido no encontrado');
    if (CLOSED.includes(order.status)) throw AppError.conflict(`El pedido está ${order.status}: ya no se puede modificar`);
    if (data.deliveryAddress && order.type !== 'DOMICILIO') throw AppError.badRequest('Solo los pedidos a domicilio llevan dirección');

    const savedCustomer = customer
      ? await tx.customer.upsert({ where: { phone: customer.phone }, update: { name: customer.name }, create: customer })
      : null;

    await tx.order.update({ where: { id }, data: { ...data, ...(savedCustomer && { customerId: savedCustomer.id }) } });
    const changed = [...Object.keys(data), ...(customer ? ['cliente'] : [])]
      .map((k) => ({ notes: 'notas', deliveryAddress: 'dirección', paymentMethod: 'método de pago' })[k] ?? k)
      .join(', ');
    await tx.orderStatusHistory.create({
      data: { orderId: id, previousStatus: order.status, newStatus: order.status, changedById: user.id, note: `Datos actualizados: ${changed}` },
    });
  });
  return getOrder(id);
}
