import { useEffect, useId, useRef, useState } from 'react';

// Link auf eine andere Textseite der Website: Auswahl der Seiten-Kennung, Ziel wird "<id>.html".
export default function PageLinkForm({ pageIds, initialText = '', onSubmit, onCancel }) {
  const [pick, setPick] = useState(pageIds[0] ?? '');
  const [label, setLabel] = useState(initialText);
  const id = useId();
  const select = useRef(null);
  useEffect(() => { select.current?.focus(); }, []);

  return (
    <form className="link-form" onSubmit={(e) => { e.preventDefault(); if (pick) onSubmit({ href: `${pick}.html`, text: label.trim() || pick }); }}
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}>
      <label htmlFor={`${id}-text`}>Anzeigetext</label>
      <input id={`${id}-text`} type="text" value={label} onChange={(e) => setLabel(e.target.value)} />
      <label htmlFor={`${id}-page`}>Seite</label>
      {pageIds.length === 0
        ? <p>Keine Textseiten vorhanden.</p>
        : (
          <select id={`${id}-page`} ref={select} value={pick} onChange={(e) => setPick(e.target.value)}>
            {pageIds.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
      <div className="link-form-actions">
        <button type="submit" className="btn-primary" disabled={!pick}>Übernehmen</button>
        <button type="button" onClick={onCancel}>Abbrechen</button>
      </div>
    </form>
  );
}
