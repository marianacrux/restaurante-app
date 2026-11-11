import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

async function resolveUser(req) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw AppError.unauthorized('Sesión inválida o expirada');
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(payload.sub) },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  if (!user || !user.active) throw AppError.unauthorized('Usuario inactivo o inexistente');
  return user;
}

export async function authenticate(req, res, next) {
  const user = await resolveUser(req);
  if (!user) throw AppError.unauthorized('Debe iniciar sesión');
  req.user = user;
  next();
}

export async function optionalAuth(req, res, next) {
  req.user = await resolveUser(req);
  next();
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };
}