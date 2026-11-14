import ui from '../styles/ui.module.css';

/**
 * Etiqueta de color. Recibe una entrada de los diccionarios de constants.js
 * ({ label, tone }); si no la hay, muestra el valor tal cual.
 */
export default function Badge({ info, value }) {
  const { label, tone } = info ?? { label: value, tone: 'neutral' };
  return (
    <span className={ui.badge} data-tone={tone}>
      {label}
    </span>
  );
}
