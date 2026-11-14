import { useEffect, useState } from 'react';
import { Badge, Tooltip } from '@mantine/core';
import { onConnectionChange } from '../services/socket.js';

/** Punto verde "En vivo" cuando hay conexión en tiempo real con el servidor. */
export default function LiveIndicator() {
  const [live, setLive] = useState(false);
  useEffect(() => onConnectionChange(setLive), []);

  return (
    <Tooltip label={live ? 'Los cambios aparecen al instante' : 'Sin conexión en vivo: se actualiza cada minuto'}>
      <Badge variant="dot" color={live ? 'green' : 'gray'} size="lg" visibleFrom="xs">
        {live ? 'En vivo' : 'Reconectando…'}
      </Badge>
    </Tooltip>
  );
}
