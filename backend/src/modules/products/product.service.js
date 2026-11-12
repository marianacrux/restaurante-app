import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';

// Con cada producto traemos el nombre de su categoría 
const include = { category: { select: { id: true, name: true } } };

export function listProducts({ categoryId, available, dailyMenu, search, includeInactive = false } = {}) {
  return prisma.product.findMany({
    where: {
      ...(includeInactive ? {} : { active: true, category: { active: true } }),
      ...(categoryId && { categoryId }),
      ...(available !== undefined && { available }),
      ...(dailyMenu !== undefined && { isDailyMenu: dailyMenu }),
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    },
    include,
    orderBy: [{ category: { position: 'asc' } }, { name: 'asc' }],
  });
}

export async function getProduct(id, { includeInactive = false } = {}) {
  const product = await prisma.product.findUnique({ where: { id }, include });
  if (!product || (!includeInactive && !product.active)) throw AppError.notFound('Producto no encontrado');
  return product;
}

async function assertCategoryExists(categoryId) {
  if (categoryId === undefined) return; // al editar, puede no venir
  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) throw AppError.badRequest('La categoría seleccionada no existe');
}

export async function createProduct(data) {
  await assertCategoryExists(data.categoryId);
  return prisma.product.create({ data, include });
}

export async function updateProduct(id, data) {
  await getProduct(id, { includeInactive: true }); 
  await assertCategoryExists(data.categoryId);
  return prisma.product.update({ where: { id }, data, include });
}

export async function setAvailability(id, available) {
  await getProduct(id);
  return prisma.product.update({ where: { id }, data: { available }, include });
}


export async function deactivateProduct(id) {
  await getProduct(id, { includeInactive: true });
  return prisma.product.update({ where: { id }, data: { active: false }, include });
}