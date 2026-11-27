import { useEffect, useState } from 'react';
import { listHistory } from '../history/history.js';

const fmt = (d) => d.toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' });

export default function HistoryPanel({ site, client }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    listHistory(client, site.repo, 20)
      .then((l) => { if (live) setItems(l); })
      .catch((e) => { if (live) setError(e.message || 'Der Verlauf konnte nicht geladen werden.'); });
    return () => { live = false; };
  }, [client, site.repo]);

  return (
    <section className="history-panel">
      <h1>Verlauf</h1>
      {error && <p role="alert">{error}</p>}
      {!error && !items && <p role="status">Wird geladen …</p>}
      {items && items.length === 0 && <p>Noch keine Änderungen.</p>}
      {items && items.length > 0 && (
        <ul>
          {items.map((h, i) => (
            <li key={i}>{fmt(h.when)} — {h.who}: {h.message}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
