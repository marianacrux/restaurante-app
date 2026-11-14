// Subida de imágenes (productos, promociones, anuncios de pantallas).
// Para el demo se guardan en backend/uploads y se sirven en /uploads/<archivo>.
// Para producción basta con cambiar el "storage" por uno externo (S3, Cloudinary…):
// el resto del sistema solo guarda la URL que devuelve esta ruta.
import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { AppError } from '../../utils/AppError.js';

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

const EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const MAX_MB = 3;

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    // Nombre aleatorio: evita choques y que alguien adivine o sobrescriba archivos
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${EXTENSIONS[file.mimetype]}`),
  }),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (EXTENSIONS[file.mimetype]) cb(null, true);
    else cb(AppError.badRequest('Solo se permiten imágenes JPG, PNG, WEBP o GIF'));
  },
});

const router = Router();

router.post('/', authenticate, authorize('ADMIN'), (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return next(AppError.badRequest(err.code === 'LIMIT_FILE_SIZE' ? `La imagen supera ${MAX_MB} MB` : 'No se pudo subir la imagen'));
    }
    if (err) return next(err);
    if (!req.file) return next(AppError.badRequest('Seleccione una imagen (campo "image")'));
    res.status(201).json({ url: `/uploads/${req.file.filename}`, size: req.file.size });
  });
});

export default router;
