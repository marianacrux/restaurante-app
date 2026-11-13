import styles from './StatCard.module.css';

/** Tarjeta de indicador: un número grande con su etiqueta y una aclaración. */
export default function StatCard({ label, value, hint }) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  );
}