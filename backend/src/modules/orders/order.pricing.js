import { Prisma } from '@prisma/client';
import { AppError } from '../../utils/AppError.js';

const ZERO = new Prisma.Decimal(0);

export async function buildOrderLines(tx, items) {
  const ids = [...new Set(items.map((i) => i.productId))]; 
  const products = await tx.product.findMany({
    where: { id: { in: ids } },
    include: { category: { select: { active: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p])); 

  const problems = [];
  for (const id of ids) {
    const p = byId.get(id);
    if (!p || !p.active || !p.category.active) problems.push(`El producto #${id} no existe o fue retirado del menú`);
    else if (!p.available) problems.push(`"${p.name}" está agotado`);
  }
  if (problems.length) throw AppError.conflict(problems.join('. '));

  const lines = items.map((item) => {
    const product = byId.get(item.productId);
    return {
      productId: product.id,
      productName: product.name,  
      unitPrice: product.price,   
      quantity: item.quantity,
      notes: item.notes || null,
      subtotal: product.price.mul(item.quantity),
    };
  });

  const subtotal = lines.reduce((sum, line) => sum.add(line.subtotal), ZERO);
  return { lines, subtotal };
}

//calculo total del pedido
export function computeTotal({ subtotal, discount = ZERO, deliveryFee = ZERO }) {
  const total = new Prisma.Decimal(subtotal).sub(discount).add(deliveryFee);
  return total.isNegative() ? ZERO : total;
}