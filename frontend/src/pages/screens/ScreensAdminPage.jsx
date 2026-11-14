import { useEffect, useState } from 'react';
import {
  fetchProducts,
  fetchPromotions,
  fetchScreenConfig,
  fetchScreens,
  saveScreenContent,
} from '../../services/screens.service.js';
import { getErrorMessage } from '../../services/api.js';
import { formatMoney } from '../../utils/format.js';
import ui from '../../styles/ui.module.css';

const TYPE_LABEL = { PRODUCTO: 'Producto', PROMOCION: 'Promoción', ANUNCIO: 'Anuncio' };

/** Convierte un contenido guardado en una fila editable. */
const toDraft = (c) => ({
  key: crypto.randomUUID(),
  contentType: c.contentType,
  productId: c.productId,
  promotionId: c.promotionId,
  title: c.title ?? '',
  description: c.description ?? '',
  active: c.active,
});

export default function ScreensAdminPage() {
  const [screens, setScreens] = useState([]);
  const [catalog, setCatalog] = useState({ products: [], promotions: [] });
  const [number, setNumber] = useState(1);
  const [name, setName] = useState('');
  const [items, setItems] = useState(null); // filas editables de la pantalla elegida
  const [toAdd, setToAdd] = useState({ productId: '', promotionId: '', title: '', description: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Una vez: lista de pantallas, productos y promociones
  useEffect(() => {
    let ignore = false;
    Promise.all([fetchScreens(), fetchProducts(), fetchPromotions()])
      .then(([screenList, products, promotions]) => {
        if (ignore) return;
        setScreens(screenList);
        setCatalog({ products, promotions });
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Cada vez que se elige otra pantalla: su configuración
  useEffect(() => {
    let ignore = false;
    fetchScreenConfig(number)
      .then((config) => {
        if (ignore) return;
        setName(config.name);
        setItems(config.contents.map(toDraft));
        setError('');
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, [number]);

  const productById = new Map(catalog.products.map((p) => [p.id, p]));
  const promotionById = new Map(catalog.promotions.map((p) => [p.id, p]));

  function describe(item) {
    if (item.contentType === 'PRODUCTO') {
      const p = productById.get(item.productId);
      if (!p) return 'Producto retirado';
      return `${p.name} · ${formatMoney(p.price)}${p.available ? '' : ' · AGOTADO'}`;
    }
    if (item.contentType === 'PROMOCION') {
      const p = promotionById.get(item.promotionId);
      if (!p) return 'Promoción eliminada';
      return `${p.name}${p.finalPrice ? ` · ${formatMoney(p.finalPrice)}` : ''}${p.live ? '' : ' · NO VIGENTE'}`;
    }
    return `${item.title}${item.description ? ` — ${item.description}` : ''}`;
  }

  // ---------- edición local (nada se guarda hasta pulsar "Guardar")
  const update = (key, changes) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...changes } : i)));
  const remove = (key) => setItems((list) => list.filter((i) => i.key !== key));
  function move(index, delta) {
    setItems((list) => {
      const next = [...list];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });
  }
  function add(contentType) {
    const base = { key: crypto.randomUUID(), contentType, productId: null, promotionId: null, title: '', description: '', active: true };
    if (contentType === 'PRODUCTO') base.productId = Number(toAdd.productId);
    if (contentType === 'PROMOCION') base.promotionId = Number(toAdd.promotionId);
    if (contentType === 'ANUNCIO') Object.assign(base, { title: toAdd.title.trim(), description: toAdd.description.trim() });
    setItems((list) => [...list, base]);
    setToAdd({ productId: '', promotionId: '', title: '', description: '' });
  }

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const config = await saveScreenContent(number, {
        name,
        items: items.map((i) => ({
          contentType: i.contentType,
          productId: i.productId,
          promotionId: i.promotionId,
          title: i.title || null,
          description: i.description || null,
          active: i.active,
        })),
      });
      setItems(config.contents.map(toDraft));
      setScreens((list) => list.map((s) => (s.screenNumber === number ? { ...s, name: config.name } : s)));
      setMessage(`Pantalla ${number} guardada. Los televisores la verán en menos de 30 s.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className={ui.header}>
        <div>
          <h1 className={ui.title}>Pantallas</h1>
          <p className={ui.subtitle}>Contenido de los televisores del restaurante</p>
        </div>
        <div className={ui.row}>
          {screens.map((s) => (
            <button
              key={s.id}
              className={`${ui.button} ${s.screenNumber === number ? ui.primary : ''}`}
              onClick={() => {
                setMessage('');
                setItems(null);
                setNumber(s.screenNumber);
              }}
            >
              {s.screenNumber}. {s.name}
            </button>
          ))}
        </div>
      </header>

      {error && <p className={ui.alert}>{error}</p>}
      {message && <p className={ui.success}>{message}</p>}
      {!items && !error && <p>Cargando…</p>}

      {items && (
        <>
          <section className={`${ui.card} ${ui.section}`}>
            <div className={ui.row} style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <label className={ui.field}>
                Nombre de la pantalla
                <input className={ui.input} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
              </label>
              <div className={ui.row}>
                <a className={ui.button} href={`/pantalla/${number}`} target="_blank" rel="noreferrer">
                  Abrir pantalla ↗
                </a>
                <button className={`${ui.button} ${ui.primary}`} onClick={save} disabled={saving || name.trim().length < 2}>
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <p className={ui.empty}>Esta pantalla no tiene contenido.</p>
            ) : (
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Tipo</th>
                      <th>Contenido</th>
                      <th>Visible</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.key} style={{ opacity: item.active ? 1 : 0.5 }}>
                        <td>{index + 1}</td>
                        <td>{TYPE_LABEL[item.contentType]}</td>
                        <td>{describe(item)}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={item.active}
                            onChange={(e) => update(item.key, { active: e.target.checked })}
                            aria-label="Visible"
                          />
                        </td>
                        <td className={ui.row} style={{ flexWrap: 'nowrap' }}>
                          <button className={`${ui.button} ${ui.small}`} disabled={index === 0} onClick={() => move(index, -1)} aria-label="Subir">
                            ↑
                          </button>
                          <button
                            className={`${ui.button} ${ui.small}`}
                            disabled={index === items.length - 1}
                            onClick={() => move(index, 1)}
                            aria-label="Bajar"
                          >
                            ↓
                          </button>
                          <button className={`${ui.button} ${ui.small} ${ui.danger}`} onClick={() => remove(item.key)}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={ui.grid}>
            <div className={ui.card}>
              <h2 className={ui.cardTitle}>Agregar producto</h2>
              <p className={ui.muted}>El precio y si está agotado se leen en vivo del catálogo.</p>
              <div className={ui.row}>
                <select
                  className={ui.input}
                  style={{ flex: 1 }}
                  value={toAdd.productId}
                  onChange={(e) => setToAdd({ ...toAdd, productId: e.target.value })}
                  aria-label="Producto"
                >
                  <option value="">Elegir…</option>
                  {catalog.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {formatMoney(p.price)}
                    </option>
                  ))}
                </select>
                <button className={ui.button} disabled={!toAdd.productId} onClick={() => add('PRODUCTO')}>
                  Agregar
                </button>
              </div>
            </div>

            <div className={ui.card}>
              <h2 className={ui.cardTitle}>Agregar promoción</h2>
              <p className={ui.muted}>Las vencidas no se muestran en el televisor.</p>
              <div className={ui.row}>
                <select
                  className={ui.input}
                  style={{ flex: 1 }}
                  value={toAdd.promotionId}
                  onChange={(e) => setToAdd({ ...toAdd, promotionId: e.target.value })}
                  aria-label="Promoción"
                >
                  <option value="">Elegir…</option>
                  {catalog.promotions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.live ? '' : ' (no vigente)'}
                    </option>
                  ))}
                </select>
                <button className={ui.button} disabled={!toAdd.promotionId} onClick={() => add('PROMOCION')}>
                  Agregar
                </button>
              </div>
            </div>

            <div className={ui.card}>
              <h2 className={ui.cardTitle}>Agregar anuncio</h2>
              <div style={{ display: 'grid', gap: 8 }}>
                <input
                  className={ui.input}
                  placeholder="Título (obligatorio)"
                  maxLength={120}
                  value={toAdd.title}
                  onChange={(e) => setToAdd({ ...toAdd, title: e.target.value })}
                />
                <input
                  className={ui.input}
                  placeholder="Texto (opcional)"
                  maxLength={300}
                  value={toAdd.description}
                  onChange={(e) => setToAdd({ ...toAdd, description: e.target.value })}
                />
                <button className={ui.button} disabled={!toAdd.title.trim()} onClick={() => add('ANUNCIO')}>
                  Agregar
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
