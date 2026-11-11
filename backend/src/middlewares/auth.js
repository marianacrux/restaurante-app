import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';

export async function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Debe iniciar sesión' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET); // comprueba firma y vencimiento
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(payload.sub) },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  if (!user || !user.active) {
    return res.status(401).json({ error: 'Usuario inactivo o inexistente' });
  }

  req.user = user; // las rutas siguientes ya saben quién hace la petición
  next();
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tiene permisos para esta acción' });
    }
    next();
  };
}