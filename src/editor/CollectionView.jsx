import { useMemo, useState } from 'react';
import { newEntry } from '../fields/registry.js';
import EntryForm from './EntryForm.jsx';
import { collectionErrors, isNewEntry, keyOf } from './entryState.js';

const titleOf = (collection, row) => String(row[collection.titleField] ?? '').trim();

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
export default function CollectionView({ collection, data, original, collections, onChange, planFor, onDelete }) {
  const rows = data[collection.id] ?? [];
  const [query, setQuery] = useState('');
  // Offener Eintrag: Position in rows; isNew wird beim Oeffnen festgelegt,
  // damit die Kennung nicht mitten im Tippen schreibgeschuetzt wird. Aendert sich die
  // Basis (nach dem Speichern), gilt wieder der Vergleich mit der neuen Basis.
  const [open, setOpen] = useState(null);
  const openEntry = (index, isNew) => setOpen({ index, isNew, original });

  const errors = useMemo(
    () => collectionErrors(collection, rows, { data, collections, original }),
    [collection, rows, data, collections, original],
  );

  if (open && rows[open.index]) {
    const entry = rows[open.index];
    const isNew = open.original === original ? open.isNew : isNewEntry(collection, entry, original);
    return (
      <EntryForm collection={collection} entry={entry} data={data} collections={collections} isNew={isNew}
        onChange={(next) => onChange(rows.map((r, i) => (i === open.index ? next : r)))}
        onBack={() => setOpen(null)}
        planFor={planFor}
        onDelete={onDelete && ((id, opts) => { setOpen(null); onDelete(id, opts); })} />
    );
  }

  const q = query.trim().toLowerCase();
  const shown = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => titleOf(collection, row).toLowerCase().includes(q))
    .sort((a, b) => compare(collection, a.row, b.row));

  const create = () => {
    onChange([...rows, newEntry(collection)]);
    openEntry(rows.length, true);
  };

  return (
    <div className="collection-view">
      <h1>{collection.label}</h1>
      <p>{rows.length === 1 ? '1 Eintrag' : `${rows.length} Einträge`}</p>
      <div className="list-tools">
        <label htmlFor="entry-search">Suchen</label>
        <input id="entry-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="button" onClick={create}>Neu</button>
      </div>
      <ul className="entry-list">
        {shown.map(({ row, index }) => (
          <li key={index}>
            <button type="button" onClick={() => openEntry(index, isNewEntry(collection, row, original))}>
              <span className="entry-title">{titleOf(collection, row) || '(ohne Titel)'}</span>
              {errors[row[keyOf(collection)]] && <span className="entry-error">Fehler</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
