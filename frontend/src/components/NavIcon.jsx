import {
  IconCash,
  IconChartBar,
  IconChefHat,
  IconDeviceTv,
  IconDiscount2,
  IconFileSpreadsheet,
  IconHome,
  IconListDetails,
  IconMessageCircle,
  IconMotorbike,
  IconSettings,
  IconSquareRoundedPlus,
  IconToolsKitchen,
  IconUsers,
} from '@tabler/icons-react';

// Íconos del menú. access.js guarda solo el nombre (texto) para no mezclar lógica con interfaz.
const ICONS = {
  home: IconHome,
  chart: IconChartBar,
  plus: IconSquareRoundedPlus,
  list: IconListDetails,
  chef: IconChefHat,
  moto: IconMotorbike,
  cash: IconCash,
  menu: IconToolsKitchen,
  discount: IconDiscount2,
  chat: IconMessageCircle,
  tv: IconDeviceTv,
  excel: IconFileSpreadsheet,
  users: IconUsers,
  settings: IconSettings,
};

export default function NavIcon({ name, size = 20 }) {
  const Icon = ICONS[name] ?? IconHome;
  return <Icon size={size} stroke={1.7} />;
}
