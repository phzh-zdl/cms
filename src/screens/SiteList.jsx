import { useEffect, useState } from 'react';
import { listSites } from '../content/site.js';

export default function SiteList({ client, onSelect }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    listSites(client).then(
      (sites) => { if (!cancelled) setState({ status: 'done', sites }); },
      (e) => { if (!cancelled) setState({ status: 'error', message: e?.message || 'Die Seiten konnten nicht geladen werden.' }); },
    );
    return () => { cancelled = true; };
  }, [client]);

  return (
    <section className="site-list">
      <h1>Seite wählen</h1>
      {state.status === 'loading' && <p role="status">Seiten werden geladen …</p>}
      {state.status === 'error' && <p role="alert" className="error">{state.message}</p>}
      {state.status === 'done' && state.sites.length === 0 && (
        <p>Keine Seiten gefunden. Ihr Zugangsschlüssel hat keinen Zugriff auf eine Seite mit CMS-Beschreibung.</p>
      )}
      {state.status === 'done' && state.sites.length > 0 && (
        <ul>
          {state.sites.map((s) => (
            <li key={s.repo}>
              {s.error ? (
                <>
                  <button type="button" disabled>{s.repo}</button>
                  <p className="error">Beschreibung fehlerhaft: {s.error}</p>
                </>
              ) : (
                <button type="button" onClick={() => onSelect(s.repo)}>{s.name}</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
