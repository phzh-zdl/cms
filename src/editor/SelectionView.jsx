import { useEffect, useRef, useState } from 'react';
import SettingsForm from './SettingsForm.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { keyOf, titleOf, displayTitle } from './entryState.js';

const MAX_HITS = 10;

function hitsText(query, n) {
  if (query === '') return '';
  if (n === 0) return 'Keine Treffer';
  return n > MAX_HITS ? `${n} Treffer, die ersten ${MAX_HITS} werden gezeigt` : `${n} Treffer`;
}

// Auswahl-Ansicht (views[].type = "selection"): Eintraege einer Sammlung, deren Ja/Nein-Feld gesetzt ist.
// Aendert nur den Arbeitsstand (onChange(rows) wie das Formular) - gespeichert wird ueber die Speicherleiste.
// settingsDef/settingsStored/onSettingsChange: optionale zugehoerige Einstellungen (dasselbe Formular wie eigenstaendig).
export default function SelectionView({ view, collection, rows, onChange, onOpenEntry, settingsDef, settingsStored, onSettingsChange }) {
  const key = keyOf(collection);
  const field = view.field;
  const [query, setQuery] = useState('');
  const [confirming, setConfirming] = useState(false);
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const clearRef = useRef(null);
  // Nach dem naechsten Zeichnen fokussieren: { remove: Kennung } (dessen "Entfernen") oder 'search'.
  const focusNext = useRef(null);

  useEffect(() => {
    const want = focusNext.current;
    if (!want) return;
    focusNext.current = null;
    const target = want === 'search' ? null
      : [...(rootRef.current?.querySelectorAll('[data-remove]') ?? [])].find((b) => b.dataset.remove === String(want.remove));
    (target ?? searchRef.current)?.focus();
  });

  const selected = rows.filter((r) => r[field] === true);
  const q = query.trim().toLowerCase();
  const candidates = q === '' ? [] : rows.filter((r) => r[field] !== true && titleOf(collection, r).toLowerCase().includes(q));
  const setFlag = (ids, on) => onChange(rows.map((r) => (ids.includes(r[key]) ? { ...r, [field]: on } : r)));

  const remove = (id) => {
    // Fokus auf den naechsten (sonst vorherigen) Eintrag, damit er nicht verloren geht.
    const at = selected.findIndex((r) => r[key] === id);
    const neighbour = selected[at + 1] ?? selected[at - 1];
    focusNext.current = neighbour ? { remove: neighbour[key] } : 'search';
    setFlag([id], false);
  };
  const add = (id) => {
    focusNext.current = 'search';
    setFlag([id], true);
  };
  const cancelClear = () => {
    setConfirming(false);
    queueMicrotask(() => clearRef.current?.focus());
  };
  const confirmClear = () => {
    setConfirming(false);
    setFlag(selected.map((r) => r[key]), false);
    queueMicrotask(() => searchRef.current?.focus());
  };

  const n = selected.length;
  const clearText = (view.clearConfirm ?? 'Alle {n} Einträge abwählen?').replaceAll('{n}', String(n));
  const addLabel = view.addLabel ?? 'Eintrag hinzufügen';
  const headingId = `selection-${view.name}`;

  return (
    <div className="selection-view" ref={rootRef}>
      <h1>{view.label}</h1>
      {view.hint && <p className="hint">{view.hint}</p>}

      {settingsDef && (
        <section aria-labelledby={`${headingId}-settings`}>
          <h2 id={`${headingId}-settings`}>Einstellungen</h2>
          <SettingsForm def={settingsDef} stored={settingsStored} onChange={onSettingsChange} />
        </section>
      )}

      <section aria-labelledby={`${headingId}-selected`}>
        <h2 id={`${headingId}-selected`}>Ausgewählt ({n})</h2>
        {n === 0 ? <p>Noch nichts ausgewählt.</p> : (
          <ul className="pick-list is-selected">
            {selected.map((row) => {
              const title = displayTitle(collection, row);
              return (
                <li key={row[key]}>
                  <span className="pick-title">{title}</span>
                  <button type="button" data-remove={row[key]} aria-label={`„${title}“ entfernen`}
                    onClick={() => remove(row[key])}>Entfernen</button>
                  <button type="button" className="btn-ghost" aria-label={`„${title}“ öffnen`}
                    onClick={() => onOpenEntry(collection.id, row[key])}>Öffnen</button>
                </li>
              );
            })}
          </ul>
        )}
        {n > 0 && (
          <div className="actions pick-actions">
            <button type="button" ref={clearRef} onClick={() => setConfirming(true)}>Alle abwählen</button>
          </div>
        )}
      </section>

      <section aria-labelledby={`${headingId}-add`}>
        <h2 id={`${headingId}-add`}>Hinzufügen</h2>
        <div className="field">
          <label htmlFor="selection-search">{addLabel}</label>
          <input id="selection-search" type="search" ref={searchRef} value={query} autoComplete="off"
            aria-describedby="selection-hits" onChange={(e) => setQuery(e.target.value)} />
          <p id="selection-hits" className="hint" aria-live="polite">{hitsText(q, candidates.length)}</p>
        </div>
        {candidates.length > 0 && (
          <ul className="pick-list is-hits">
            {candidates.slice(0, MAX_HITS).map((row) => {
              const title = displayTitle(collection, row);
              return (
                <li key={row[key]}>
                  <span className="pick-title">{title}</span>
                  <button type="button" aria-label={`„${title}“ hinzufügen`} onClick={() => add(row[key])}>Hinzufügen</button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {confirming && (
        <ConfirmDialog title="Alle abwählen" text={clearText} confirmLabel="Abwählen"
          onConfirm={confirmClear} onCancel={cancelClear} />
      )}
    </div>
  );
}
