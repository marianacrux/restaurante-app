//recibe datos y devuelve datos
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';

export function listCategories({ includeInactive = false } = {}) {
  return prisma.category.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  });
}

export function createCategory(data) {
  return prisma.category.create({ data });
}

export async function updateCategory(id, data) {
  const exists = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw AppError.notFound('Categoría no encontrada');
  return prisma.category.update({ where: { id }, data });
}