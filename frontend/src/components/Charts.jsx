import styles from './Charts.module.css';

/**
 * Barras horizontales con su etiqueta y su valor (también sirve como tabla).
 * rows: [{ key, label, value: número, display: texto, hint?: texto }]
 */
export function BarList({ rows, emptyText = 'Sin datos' }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  if (max === 0) return <p className={styles.empty}>{emptyText}</p>;

  return (
    <ul className={styles.barList}>
      {rows.map((row) => (
        <li key={row.key}>
          <div className={styles.barMeta}>
            <span>{row.label}</span>
            <span className={styles.barValue}>
              {row.display}
              {row.hint && <span className={styles.hint}> · {row.hint}</span>}
            </span>
          </div>
          <div className={styles.track}>
            {row.value > 0 && <div className={styles.bar} style={{ width: `${(row.value / max) * 100}%` }} />}
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Columnas verticales para una serie corta en el tiempo (p. ej. 7 días).
 * El valor exacto aparece al pasar el cursor y en la tabla de abajo.
 * points: [{ key, label, value: número, display: texto }]
 */
export function ColumnChart({ points, height = 160 }) {
  const max = Math.max(0, ...points.map((p) => p.value));

  return (
    <figure className={styles.figure}>
      <div className={styles.columns} style={{ height }}>
        {points.map((p) => (
          <div key={p.key} className={styles.column} title={`${p.label}: ${p.display}`}>
            {p.value > 0 && <div className={styles.columnBar} style={{ height: `${(p.value / max) * 100}%` }} />}
          </div>
        ))}
      </div>
      <div className={styles.axis}>
        {points.map((p) => (
          <span key={p.key}>{p.label}</span>
        ))}
      </div>
      <details className={styles.table}>
        <summary>Ver como tabla</summary>
        <table>
          <tbody>
            {points.map((p) => (
              <tr key={p.key}>
                <td>{p.label}</td>
                <td>{p.display}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}