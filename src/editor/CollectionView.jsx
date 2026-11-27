import { useEffect, useMemo, useState } from 'react';
import { newEntry } from '../fields/registry.js';
import EntryForm from './EntryForm.jsx';
import { collectionErrors, isNewEntry, keyOf, titleOf, displayTitle } from './entryState.js';

function compare(collection, a, b) {
  const sb = collection.sortBy;
  if (sb && a[sb] != null && b[sb] != null && a[sb] !== b[sb]) {
    if (typeof a[sb] === 'number' && typeof b[sb] === 'number') return a[sb] - b[sb];
    const c = String(a[sb]).localeCompare(String(b[sb]), 'de');
    if (c !== 0) return c;
  }
  return titleOf(collection, a).localeCompare(titleOf(collection, b), 'de');
}

// Liste mit Suche + Formular. data = Arbeitsstand aller Sammlungen,
// original = urspruenglich geladene Daten (fuer "neu"), onChange(rows) ersetzt diese Sammlung.
// initialEntry = Kennung eines Eintrags, der gleich geoeffnet wird (Sprung aus einer anderen Ansicht);
// onOpenEntry(collectionId, Kennung) springt zu einem Eintrag (fuer "Verwendet von").
export default function CollectionView({
  collection, data, original, collections, images, onChange, planFor, onDelete, initialEntry, onOpenEntry,
}) {
  const rows = data[collection.id] ?? [];
  const [query, setQuery] = useState('');
  const key = keyOf(collection);
  // Offener Eintrag: ueber das Zeilen-Objekt (row, bei jeder Eingabe nachgefuehrt) bzw. seine Kennung,
  // nicht ueber die Position - ein Zusammenfuehren beim Speichern kann die Reihenfolge aendern. isNew wird beim Oeffnen festgelegt, damit die
  // Kennung nicht mitten im Tippen schreibgeschuetzt wird. Aendert sich die Basis (nach dem
  // Speichern), gilt wieder der Vergleich mit der neuen Basis.
  const [open, setOpen] = useState(() => {
    const row = initialEntry === undefined ? undefined : rows.find((r) => r[key] === initialEntry);
    return row ? { id: row[key], row, isNew: isNewEntry(collection, row, original), original } : null;
  });
  const [gone, setGone] = useState(false); // offener Eintrag ist verschwunden (von jemand anderem geloescht)
  const openEntry = (row, isNew) => { setGone(false); setOpen({ id: row[key], row, isNew, original }); };
  // Zuerst genau die zuletzt bearbeitete Zeile (eindeutig, auch bei doppelt getippter Kennung),
  // sonst - die Zeilen wurden ersetzt, z. B. beim Zusammenfuehren - ueber die Kennung.
  const openIndex = !open ? -1 : (() => {
    const same = rows.indexOf(open.row);
    if (same !== -1) return same;
    return open.id !== '' && open.id != null ? rows.findIndex((r) => r[key] === open.id) : -1;
  })();

  useEffect(() => {
    if (open && openIndex === -1) { setOpen(null); setGone(true); }
  }, [open, openIndex]);

  const errors = useMemo(
    () => collectionErrors(collection, rows, { data, collections, original }),
    [collection, rows, data, collections, original],
  );

  if (open && openIndex !== -1) {
    const entry = rows[openIndex];
    const isNew = open.original === original ? open.isNew : isNewEntry(collection, entry, original);
    return (
      <EntryForm collection={collection} entry={entry} data={data} collections={collections} isNew={isNew} images={images}
        onChange={(next) => {
          setOpen((o) => o && { ...o, id: next[key], row: next });
          onChange(rows.map((r, i) => (i === openIndex ? next : r)));
        }}
        onBack={() => setOpen(null)}
        planFor={planFor}
        onOpenEntry={onOpenEntry}
        onDelete={onDelete && ((id, opts) => { setOpen(null); onDelete(id, opts); })} />
    );
  }

  const q = query.trim().toLowerCase();
  const shown = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => titleOf(collection, row).toLowerCase().includes(q))
    .sort((a, b) => compare(collection, a.row, b.row));

  const create = () => {
    const row = newEntry(collection);
    onChange([...rows, row]);
    openEntry(row, true);
  };

  return (
    <div className="collection-view">
      <h1>{collection.label}</h1>
      {gone && <p role="status" className="note">Dieser Eintrag wurde inzwischen gelöscht.</p>}
      <p className="count">{rows.length === 1 ? '1 Eintrag' : `${rows.length} Einträge`}</p>
      <div className="list-tools">
        <label htmlFor="entry-search">Suchen</label>
        <input id="entry-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="button" className="btn-primary" onClick={create}>Neu</button>
      </div>
      <ul className="entry-list">
        {shown.map(({ row, index }) => (
          <li key={index}>
            <button type="button" onClick={() => openEntry(row, isNewEntry(collection, row, original))}>
              <span className="entry-title">{displayTitle(collection, row)}</span>
              {errors[row[keyOf(collection)]] && <span className="entry-error">Fehler</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
