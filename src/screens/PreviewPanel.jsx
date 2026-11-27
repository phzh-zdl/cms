import { useEffect, useRef, useState } from 'react';
import { buildPreviewFiles } from '../preview/files.js';
import { fillPreviewCache, beginPreviewRun } from '../preview/cache.js';

export const MSG_UNAVAILABLE = 'Die Vorschau ist in diesem Browser nicht verfügbar. Bitte exportieren und das ZIP ansehen.';

// Der Worker liegt unter ./vorschau/, die Seite selbst nicht: `serviceWorker.ready` wuerde hier nie
// fertig, deshalb auf den Worker der Registrierung warten.
function whenActive(registration) {
  const worker = registration.installing || registration.waiting || registration.active;
  if (!worker || worker.state === 'activated') return Promise.resolve();
  return new Promise((resolve, reject) => {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') resolve();
      else if (worker.state === 'redundant') reject(new Error('Die Vorschau konnte nicht gestartet werden.'));
    });
  });
}

// Baut die Vorschau (inkl. ungespeicherter Aenderungen) beim Oeffnen und auf Knopfdruck neu.
// getWork() liefert den neuesten Arbeitsstand: { data, pages, newImages, headSha, dirty }.
export default function PreviewPanel({ site, client, getWork, onBusyChange }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { onBusyChange?.(busy); }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onBusyChange?.(false), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function run() {
    setError(null); setUrl(null); setProgress(null);
    if (typeof navigator === 'undefined' || !navigator.serviceWorker || typeof caches === 'undefined') {
      setError(MSG_UNAVAILABLE);
      return;
    }
    setBusy(true);
    const gen = beginPreviewRun(); // nur der neueste Lauf darf den Cache beschreiben
    try {
      const registration = await navigator.serviceWorker.register('./vorschau/sw.js', { scope: './vorschau/' });
      await whenActive(registration);
      const files = await buildPreviewFiles(client, site.repo, site.config, getWork(), {
        onProgress: (p) => { if (alive.current) setProgress(p); },
      });
      const target = await fillPreviewCache(files, site.repo.split('/').pop(), { gen });
      if (!alive.current || target === null) return; // abgemeldet oder von neuerem Lauf abgeloest
      setUrl(target);
      // Mit noopener liefert open() immer null; der Link unten bleibt deshalb immer sichtbar.
      window.open(target, '_blank', 'noopener');
    } catch (e) {
      if (alive.current) setError(e.message || 'Die Vorschau konnte nicht erstellt werden.');
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  // Einmal pro Oeffnen (React im Entwicklungsmodus ruft Effekte doppelt auf: sonst zwei Fenster).
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="export-panel">
      <h1>Vorschau</h1>
      <p className="lead">Zeigt die fertige Seite mit deinem aktuellen Stand in einem neuen Fenster, auch mit noch nicht gespeicherten Änderungen. Es wird nichts veröffentlicht.</p>
      <p aria-live="polite" className="export-progress">
        {busy ? (progress ? `Vorschau wird vorbereitet … ${progress.done} von ${progress.total}` : 'Vorschau wird vorbereitet …') : ''}
      </p>
      {url && (
        <p role="status" className="ok">
          Vorschau bereit. <a href={url} target="_blank" rel="noopener noreferrer">Vorschau öffnen</a>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <button type="button" disabled={busy} onClick={run}>Vorschau neu erstellen</button>
    </section>
  );
}
