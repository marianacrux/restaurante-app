// Utilidades de entregas que también usa el módulo de pedidos.
// Este archivo NO importa servicios: así evitamos importaciones circulares
// (pedidos → entregas → pedidos).

/** Estados de una entrega que mantienen OCUPADO al domiciliario. */
export const ACTIVE_DELIVERY_STATUSES = Object.freeze(['ASIGNADO', 'EN_CAMINO']);

/**
 * Si el domiciliario ya no tiene entregas activas y estaba OCUPADO,
 * vuelve a quedar DISPONIBLE. Debe ejecutarse dentro de la transacción `tx`.
 */
export async function releaseDeliveryPersonIfIdle(tx, deliveryPersonId) {
  const pending = await tx.delivery.count({
    where: { deliveryPersonId, status: { in: ACTIVE_DELIVERY_STATUSES } },
  });
  if (pending === 0) {
    await tx.deliveryPerson.updateMany({
      where: { id: deliveryPersonId, availability: 'OCUPADO' },
      data: { availability: 'DISPONIBLE' },
    });
  }
}

/** Cancela la entrega activa de un pedido (si existe) y libera al domiciliario. */
export async function cancelActiveDelivery(tx, orderId) {
  const delivery = await tx.delivery.findUnique({ where: { orderId } });
  if (!delivery || !ACTIVE_DELIVERY_STATUSES.includes(delivery.status)) return;
  await tx.delivery.update({ where: { id: delivery.id }, data: { status: 'CANCELADO' } });
  await releaseDeliveryPersonIfIdle(tx, delivery.deliveryPersonId);
}
