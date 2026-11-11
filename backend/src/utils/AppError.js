export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }

  static badRequest(message) { return new AppError(message, 400); }
  static unauthorized(message = 'Debe iniciar sesión') { return new AppError(message, 401); }
  static forbidden(message = 'No tiene permisos para esta acción') { return new AppError(message, 403); }
  static notFound(message = 'Recurso no encontrado') { return new AppError(message, 404); }
  static conflict(message) { return new AppError(message, 409); }
}