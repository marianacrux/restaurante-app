import { createTheme } from '@mantine/core';

// Tema visual de toda la aplicación (Mantine).
// El color principal es un naranja "terracota", propio de un restaurante.
export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: { light: 6, dark: 5 },
  colors: {
    brand: [
      '#fff3eb',
      '#ffe4d3',
      '#fec6a5',
      '#fca673',
      '#fa8a49',
      '#f9782d',
      '#e8661c',
      '#c2410c',
      '#a1360b',
      '#7c2a09',
    ],
  },
  fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  headings: { fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', fontWeight: '700' },
  defaultRadius: 'md',
  cursorType: 'pointer',
  components: {
    Button: { defaultProps: { radius: 'md' } },
    Paper: { defaultProps: { radius: 'lg' } },
    Card: { defaultProps: { radius: 'lg', withBorder: true, shadow: 'xs' } },
    Badge: { defaultProps: { radius: 'sm', variant: 'light' } },
    Modal: { defaultProps: { radius: 'lg', centered: true } },
    Table: { defaultProps: { verticalSpacing: 'sm', highlightOnHover: true } },
  },
});
