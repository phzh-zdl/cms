import { useEffect, useId, useRef, useState } from 'react';

// Link auf eine andere Textseite der Website: Auswahl der Seiten-Kennung, Ziel wird "<id>.html".
export default function PageLinkForm({ pageIds, onSubmit, onCancel }) {
  const [pick, setPick] = useState(pageIds[0] ?? '');
  const id = useId();
  const select = useRef(null);
  useEffect(() => { select.current?.focus(); }, []);

  return (
    <form className="link-form" onSubmit={(e) => { e.preventDefault(); if (pick) onSubmit(`${pick}.html`); }}
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}>
      <label htmlFor={`${id}-page`}>Seite</label>
      {pageIds.length === 0
        ? <p>Keine Textseiten vorhanden.</p>
        : (
          <select id={`${id}-page`} ref={select} value={pick} onChange={(e) => setPick(e.target.value)}>
            {pageIds.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
      <div className="link-form-actions">
        <button type="submit" disabled={!pick}>Übernehmen</button>
        <button type="button" onClick={onCancel}>Abbrechen</button>
      </div>
    </form>
  );
}
