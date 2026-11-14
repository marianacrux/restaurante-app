import {
  IconCash,
  IconChartBar,
  IconChefHat,
  IconDeviceTv,
  IconHome,
  IconListDetails,
  IconMessageCircle,
  IconMotorbike,
} from '@tabler/icons-react';

// Íconos del menú. access.js guarda solo el nombre (texto) para no mezclar lógica con interfaz.
const ICONS = {
  home: IconHome,
  chart: IconChartBar,
  list: IconListDetails,
  chef: IconChefHat,
  moto: IconMotorbike,
  cash: IconCash,
  chat: IconMessageCircle,
  tv: IconDeviceTv,
};

export default function NavIcon({ name, size = 20 }) {
  const Icon = ICONS[name] ?? IconHome;
  return <Icon size={size} stroke={1.7} />;
}
