import { useCallback, useEffect, useRef, useState } from 'react';

// Anuncios por voz con la API SpeechSynthesis del navegador.
// - Cola: los anuncios NUNCA se superponen; se dicen uno tras otro.
// - El navegador bloquea el sonido hasta que la persona interactúa con la
//   página, por eso el audio se activa con enable() desde un clic.
const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
const MAX_QUEUE = 10;

export function useSpeechAnnouncer() {
  const [enabled, setEnabled] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // useRef: valores que se recuerdan entre dibujos SIN provocar un redibujo
  const queueRef = useRef([]);
  const busyRef = useRef(false);
  const flagsRef = useRef({ enabled: false, muted: false });
  const lastRef = useRef(null);

  // Dice el siguiente texto de la cola. Se llama a sí misma al terminar.
  const speakNext = useCallback(function speakNext() {
    if (!supported || busyRef.current) return;
    const text = queueRef.current.shift();
    if (!text) return;

    busyRef.current = true;
    setSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CO';
    utterance.rate = 0.95;

    let watchdog;
    const done = () => {
      if (!busyRef.current) return; // ya se procesó
      clearTimeout(watchdog);
      busyRef.current = false;
      setSpeaking(false);
      setTimeout(speakNext, 500); // pequeña pausa entre anuncios
    };
    utterance.onend = done;
    utterance.onerror = done;
    // Si el navegador nunca avisa que terminó (pasa en Chrome), la cola no se queda trabada
    watchdog = setTimeout(() => {
      window.speechSynthesis.cancel();
      done();
    }, 5000 + text.length * 120);

    window.speechSynthesis.speak(utterance);
  }, []);

  /** Pone un anuncio en la cola. Si el audio está apagado, solo lo recuerda como "último". */
  const announce = useCallback(
    (text) => {
      lastRef.current = text;
      if (!flagsRef.current.enabled || flagsRef.current.muted) return;
      if (queueRef.current.length >= MAX_QUEUE) queueRef.current.shift();
      queueRef.current.push(text);
      speakNext();
    },
    [speakNext],
  );

  /** Debe llamarse desde un clic: desbloquea el sonido del navegador. */
  const enable = useCallback(() => {
    if (!supported) return;
    flagsRef.current.enabled = true;
    setEnabled(true);
    window.speechSynthesis.cancel();
    queueRef.current = ['Audio de cocina activado'];
    speakNext();
  }, [speakNext]);

  const toggleMute = useCallback(() => {
    const next = !flagsRef.current.muted;
    flagsRef.current.muted = next;
    setMuted(next);
    if (next && supported) {
      queueRef.current = [];
      window.speechSynthesis.cancel();
    }
  }, []);

  /** Repite el último anuncio; si aún no hubo ninguno, dice fallbackText. */
  const repeatLast = useCallback(
    (fallbackText) => {
      const text = lastRef.current ?? fallbackText;
      if (text) announce(text);
    },
    [announce],
  );

  // Al salir de la página, callar cualquier anuncio pendiente
  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, []);

  return { supported, enabled, muted, speaking, announce, enable, toggleMute, repeatLast };
}