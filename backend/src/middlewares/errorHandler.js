// Manejo centralizado de errores, toda respuesta de error sale de aquí, siempre en JSON.
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError.js';

export function notFoundHandler(req, res, next) {
  next(AppError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, req, res, next) {

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON mal formado' });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Ya existe un registro con esos datos' });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Registro no encontrado' });
    if (err.code === 'P2003') return res.status(409).json({ error: 'El registro está relacionado con otros datos' });
  }

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}