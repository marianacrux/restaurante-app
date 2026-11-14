import { api } from './api.js';

/** Inicia una conversación simulada. El celular es opcional. */
export async function startChat(phone) {
  const { data } = await api.post('/whatsapp-simulator/session', phone ? { phone } : {});
  return data;
}

export async function sendChatMessage(sessionId, text) {
  const { data } = await api.post('/whatsapp-simulator/message', { sessionId, text });
  return data;
}
