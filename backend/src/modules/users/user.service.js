import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';

// Nunca se devuelve el hash de la contraseña
const select = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  deliveryPerson: { select: { id: true, name: true } },
};

export function listUsers() {
  return prisma.user.findMany({ select, orderBy: [{ active: 'desc' }, { role: 'asc' }, { name: 'asc' }] });
}

export async function createUser({ password, ...data }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({ data: { ...data, passwordHash }, select });
}

export async function updateUser(id, { password, ...data }, currentUser) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw AppError.notFound('Usuario no encontrado');

  // Protecciones para no dejar el sistema sin administrador
  if (id === currentUser.id) {
    if (data.active === false) throw AppError.conflict('No puede desactivar su propia cuenta');
    if (data.role && data.role !== 'ADMIN') throw AppError.conflict('No puede quitarse a sí mismo el rol de administrador');
  }
  const losesAdmin = user.role === 'ADMIN' && user.active && ((data.role && data.role !== 'ADMIN') || data.active === false);
  if (losesAdmin) {
    const admins = await prisma.user.count({ where: { role: 'ADMIN', active: true } });
    if (admins <= 1) throw AppError.conflict('Debe quedar al menos un administrador activo');
  }

  return prisma.user.update({
    where: { id },
    data: { ...data, ...(password && { passwordHash: await bcrypt.hash(password, 10) }) },
    select,
  });
}
