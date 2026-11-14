import { useEffect, useRef, useState } from 'react';
import { Alert, Anchor, Button, Card, Code, Group, List, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconInfoCircle, IconMessagePlus, IconRefresh } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { sendChatMessage, startChat } from '../../services/whatsapp.service.js';
import { getErrorMessage } from '../../services/api.js';
import PageHeader from '../../components/PageHeader.jsx';
import { formatMoney, formatTime } from '../../utils/format.js';
import WhatsAppText from './WhatsAppText.jsx';
import styles from './WhatsAppSimulatorPage.module.css';

/** Botones de respuesta rápida según el paso de la conversación. */
const QUICK_REPLIES = {
  MENU: ['LISTO', 'VER', 'MENU'],
  TIPO: ['1', '2'],
  PAGO: ['1', '2', '3', '4'],
  CONFIRMAR: ['SI', 'NO'],
  FINALIZADO: ['ESTADO', 'NUEVO'],
};

const STEP_LABEL = {
  MENU: 'Eligiendo productos',
  TIPO: 'Tipo de entrega',
  NOMBRE: 'Nombre del cliente',
  TELEFONO: 'Teléfono',
  DIRECCION: 'Dirección',
  PAGO: 'Método de pago',
  CONFIRMAR: 'Esperando confirmación',
  FINALIZADO: 'Pedido registrado',
};

let messageId = 0; // id para la key de cada burbuja
const botMessages = (replies) => replies.map((text) => ({ id: ++messageId, from: 'bot', text, at: new Date().toISOString() }));

export default function WhatsAppSimulatorPage() {
  const [phone, setPhone] = useState('');
  const [session, setSession] = useState(null); // { id, step, cart, orderId }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Cada mensaje nuevo: bajar hasta el final del chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  async function start(e) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '').replace(/^57(?=\d{10}$)/, '');
    if (phone && !/^3\d{9}$/.test(digits)) {
      setError('El celular debe tener 10 dígitos y empezar por 3 (o déjalo vacío).');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await startChat(digits || undefined);
      setSession({ id: res.sessionId, step: res.step, cart: [], orderId: null });
      setMessages(botMessages(res.replies));
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function send(text) {
    const value = text.trim();
    if (!value || busy || !session) return;
    setInput('');
    setMessages((m) => [...m, { id: ++messageId, from: 'client', text: value, at: new Date().toISOString() }]);
    setBusy(true);
    setError('');
    try {
      const res = await sendChatMessage(session.id, value);
      setSession((s) => ({ ...s, step: res.step, cart: res.cart, orderId: res.orderId ?? s.orderId }));
      setMessages((m) => [...m, ...botMessages(res.replies)]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  const subtotal = session?.cart.reduce((s, l) => s + l.price * l.quantity, 0) ?? 0;

  return (
    <>
      <PageHeader title="Simulador de WhatsApp" subtitle="Prueba el bot de pedidos como si fueras un cliente" />

      <div className={styles.layout}>
        {/* ----------------------------- Teléfono ----------------------------- */}
        <section className={styles.phone} aria-label="Conversación simulada">
          <header className={styles.chatHeader}>
            <span className={styles.avatar} aria-hidden="true">
              R
            </span>
            <div>
              <div className={styles.chatName}>Restaurante · Pedidos</div>
              <div className={styles.chatStatus}>{busy ? 'escribiendo…' : 'en línea'}</div>
            </div>
          </header>

          <div className={styles.messages} role="log" aria-live="polite">
            {!session && (
              <div className={styles.placeholder}>Inicia una conversación para simular a un cliente que escribe al WhatsApp del restaurante.</div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`${styles.bubble} ${m.from === 'bot' ? styles.bot : styles.client}`}>
                <WhatsAppText text={m.text} />
                <span className={styles.time}>{formatTime(m.at)}</span>
              </div>
            ))}
            {busy && session && <div className={`${styles.bubble} ${styles.bot} ${styles.typing}`}>•••</div>}
            <div ref={bottomRef} />
          </div>

          {session && QUICK_REPLIES[session.step] && (
            <div className={styles.quick}>
              {QUICK_REPLIES[session.step].map((q) => (
                <button key={q} type="button" className={styles.chip} onClick={() => send(q)} disabled={busy}>
                  {q}
                </button>
              ))}
            </div>
          )}

          <form
            className={styles.composer}
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              ref={inputRef}
              className={styles.input}
              placeholder={session ? 'Escribe un mensaje' : 'Inicia una conversación →'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!session}
              maxLength={500}
              aria-label="Mensaje del cliente"
            />
            <button className={styles.send} type="submit" disabled={!session || busy || !input.trim()} aria-label="Enviar">
              ➤
            </button>
          </form>
        </section>

        {/* ---------------------------- Panel lateral ---------------------------- */}
        <Stack gap="md">
          <Alert color="blue" icon={<IconInfoCircle size={18} />} title="Modo simulación">
            No se envían mensajes reales. El bot usa el catálogo real y registra los pedidos en el sistema con canal WhatsApp.
          </Alert>

          <Card padding="lg">
            <Title order={5} mb="sm">
              Conversación
            </Title>
            <form onSubmit={start}>
              <Stack gap="sm">
                <TextInput
                  label="Celular del cliente (opcional)"
                  description="Con WhatsApp real el número llega solo. Si lo dejas vacío, el bot lo pregunta."
                  placeholder="3001234567"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.currentTarget.value)}
                />
                <Button
                  type="submit"
                  loading={busy && !session}
                  variant={session ? 'default' : 'filled'}
                  leftSection={session ? <IconRefresh size={16} /> : <IconMessagePlus size={16} />}
                >
                  {session ? 'Reiniciar conversación' : 'Iniciar conversación'}
                </Button>
              </Stack>
            </form>
            {error && (
              <Alert color="red" mt="sm">
                {error}
              </Alert>
            )}
          </Card>

          {session && (
            <Card padding="lg">
              <Title order={5} mb="sm">
                Estado del bot
              </Title>
              <Stack gap={4}>
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">
                    Paso
                  </Text>
                  <Text fw={600} size="sm">
                    {STEP_LABEL[session.step] ?? session.step}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">
                    Productos
                  </Text>
                  <Text fw={600} size="sm">
                    {session.cart.reduce((n, l) => n + l.quantity, 0)}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text c="dimmed" size="sm">
                    Subtotal
                  </Text>
                  <Text fw={600} size="sm" className="tabular">
                    {formatMoney(subtotal)}
                  </Text>
                </Group>
              </Stack>
              {session.cart.length > 0 && (
                <List size="sm" mt="sm">
                  {session.cart.map((l, i) => (
                    <List.Item key={i}>
                      {l.quantity} × {l.name}
                      {l.notes && <em> ({l.notes})</em>}
                    </List.Item>
                  ))}
                </List>
              )}
              {session.orderId && (
                <Alert color="green" mt="sm">
                  ✅ Pedido registrado.{' '}
                  <Anchor component={Link} to="/pedidos">
                    Ver pedidos
                  </Anchor>{' '}
                  ·{' '}
                  <Anchor component={Link} to="/cocina">
                    Ir a cocina
                  </Anchor>
                </Alert>
              )}
            </Card>
          )}

          <Card padding="lg">
            <Title order={5} mb="sm">
              Cómo pedir
            </Title>
            <List size="sm" spacing={4}>
              <List.Item>
                <Code>5</Code> agrega el producto 5
              </List.Item>
              <List.Item>
                <Code>5 x2</Code> agrega 2 unidades
              </List.Item>
              <List.Item>
                <Code>5 x2 sin cebolla</Code> con instrucciones
              </List.Item>
              <List.Item>
                <Code>VER</Code> muestra el pedido · <Code>QUITAR 1</Code> quita una línea
              </List.Item>
              <List.Item>
                <Code>LISTO</Code> continúa · <Code>CANCELAR</Code> empieza de nuevo
              </List.Item>
            </List>
          </Card>
        </Stack>
      </div>
    </>
  );
}
