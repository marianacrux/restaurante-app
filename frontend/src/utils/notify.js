import { notifications } from '@mantine/notifications';
import { getErrorMessage } from '../services/api.js';

/** Avisos flotantes (esquina superior derecha). */
export const notifySuccess = (message, title) => notifications.show({ color: 'green', title, message });

export const notifyError = (error, title = 'No se pudo completar') =>
  notifications.show({ color: 'red', title, message: typeof error === 'string' ? error : getErrorMessage(error) });
