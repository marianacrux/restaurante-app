import { Badge as MantineBadge } from '@mantine/core';

/**
 * Etiqueta de estado. Recibe una entrada de constants.js ({ label, color }).
 * Ej.: <Badge info={ORDER_STATUS[order.status]} />
 */
export default function Badge({ info, value, size = 'md' }) {
  const { label, color } = info ?? { label: value, color: 'gray' };
  return (
    <MantineBadge color={color} size={size} variant="light">
      {label}
    </MantineBadge>
  );
}
