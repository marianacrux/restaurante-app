import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchScreenDisplay } from '../../services/screens.service.js';
import { getErrorMessage } from '../../services/api.js';
import { formatMoney, formatTime } from '../../utils/format.js';
import styles from './DisplayScreenPage.module.css';

// Pantalla PÚBLICA para los televisores del restaurante (no inicia sesión).
// Abre /pantalla/1 … /pantalla/4 en el navegador del televisor.
const REFRESH_MS = 30000; // vuelve a pedir el contenido (precios y agotados en vivo)
const ROTATE_MS = 12000; // cambia de página cada 12 s
const PAGE_SIZE = 8; // casillas por página (4 × 2)
const THEMES = { 1: 'warm', 2: 'promo', 3: 'fresh', 4: 'dark' };
const CATEGORY_ICON = {
  'Platos fuertes': '🍛',
  Hamburguesas: '🍔',
  Combos: '🍟',
  Bebidas: '🥤',
  Adicionales: '🥔',
  Postres: '🍰',
};

export default function DisplayScreenPage() {
  const { number } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Carga y refresco. Si se cae la conexión se conserva lo último que llegó.
  useEffect(() => {
    let ignore = false;
    function load() {
      fetchScreenDisplay(number)
        .then((result) => {
          if (ignore) return;
          setData(result);
          setError('');
        })
        .catch((err) => {
          if (!ignore) setError(getErrorMessage(err));
        });
    }
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [number]);

  const pageList = paginate(data?.items ?? []);
  const pages = pageList.length;

  // Rotación de páginas y reloj
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      setPage((p) => (p + 1) % pages);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [pages]);

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }

  if (!data) {
    return (
      <div className={`${styles.screen} ${styles.warm}`}>
        <div className={styles.center}>{error ? `No se pudo cargar la pantalla ${number}: ${error}` : 'Cargando…'}</div>
      </div>
    );
  }

  const items = data.items;
  const visible = pageList[page % pages];

  return (
    <div className={`${styles.screen} ${styles[THEMES[data.screen.number] ?? 'warm']}`} onDoubleClick={toggleFullscreen}>
      <header className={styles.header}>
        <div>
          <div className={styles.brand}>{data.restaurantName}</div>
          <h1 className={styles.title}>{data.screen.name}</h1>
        </div>
        <div className={styles.clock}>{formatTime(new Date(now).toISOString())}</div>
      </header>

      {!data.screen.active ? (
        <div className={styles.center}>Pantalla en pausa</div>
      ) : items.length === 0 ? (
        <div className={styles.center}>Pronto tendremos novedades aquí</div>
      ) : (
        <main className={styles.grid} key={page}>
          {visible.map((item) => (
            <ScreenItem key={item.id} item={item} />
          ))}
        </main>
      )}

      <footer className={styles.footer}>
        {pages > 1 && (
          <div className={styles.dots} aria-hidden="true">
            {Array.from({ length: pages }, (_, i) => (
              <span key={i} className={i === page % pages ? styles.dotOn : styles.dot} />
            ))}
          </div>
        )}
        {error && <span className={styles.offline}>Sin conexión · mostrando la última información</span>}
        <span className={styles.hint}>Doble clic: pantalla completa</span>
      </footer>
    </div>
  );
}

/**
 * Reparte los elementos en páginas de PAGE_SIZE casillas.
 * Un anuncio ocupa 2 casillas, por eso se cuenta por casillas y no por elementos.
 */
function paginate(items) {
  const pages = [[]];
  let used = 0;
  for (const item of items) {
    const size = item.type === 'ANUNCIO' ? 2 : 1;
    if (used + size > PAGE_SIZE) {
      pages.push([]);
      used = 0;
    }
    pages.at(-1).push(item);
    used += size;
  }
  return pages;
}

function ScreenItem({ item }) {
  if (item.type === 'ANUNCIO') {
    return (
      <article className={`${styles.card} ${styles.announcement}`}>
        {item.imageUrl && <img src={item.imageUrl} alt="" className={styles.bgImage} />}
        <div className={styles.announcementText}>
          <h2>{item.title}</h2>
          {item.description && <p>{item.description}</p>}
        </div>
      </article>
    );
  }

  const isPromo = item.type === 'PROMOCION';
  let discount = null;
  if (isPromo) {
    discount = item.discountType === 'PORCENTAJE' ? `-${Number(item.discountValue)}%` : `-${formatMoney(item.discountValue)}`;
  }

  return (
    <article className={`${styles.card} ${isPromo ? styles.promo : ''} ${item.available ? '' : styles.soldOut}`}>
      <div className={styles.media}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className={styles.image} />
        ) : (
          <span className={styles.icon} aria-hidden="true">
            {isPromo ? '🏷️' : (CATEGORY_ICON[item.category] ?? '🍽')}
          </span>
        )}
        {discount && <span className={styles.discount}>{discount}</span>}
        {!item.available && <span className={styles.soldOutBadge}>Agotado</span>}
      </div>
      <div className={styles.body}>
        <h2 className={styles.name}>{item.title}</h2>
        {item.description && <p className={styles.description}>{item.description}</p>}
        <div className={styles.prices}>
          {isPromo && item.regularPrice && <span className={styles.regular}>{formatMoney(item.regularPrice)}</span>}
          {item.price != null && <span className={styles.price}>{formatMoney(item.price)}</span>}
        </div>
      </div>
    </article>
  );
}
