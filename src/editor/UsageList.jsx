import { useId } from 'react';
import { usagesOf } from '../content/references.js';
import { keyOf, displayTitle } from './entryState.js';

// "Verwendet von": je Sammlung, die per Verweisfeld auf diese zeigt, die verweisenden Eintraege
// aus dem Arbeitsstand (ungespeicherte Zuordnungen zaehlen). onOpen(collectionId, Kennung).
export default function UsageList({ data, collections, collectionId, id, onOpen }) {
  const baseId = useId();
  return usagesOf(data, collections, collectionId, id).map(({ collection, rows }) => {
    const headingId = `${baseId}-${collection.id}`;
    return (
      <section key={collection.id} className="usage" aria-labelledby={headingId}>
        <h2 id={headingId}>Verwendet von: {collection.label} ({rows.length})</h2>
        {rows.length === 0 ? <p>Keine Verwendung in {collection.label}.</p> : (
          <ul className="pick-list">
            {rows.map((row) => {
              const title = displayTitle(collection, row);
              return (
                <li key={row[keyOf(collection)]}>
                  <span className="pick-title">{title}</span>
                  {onOpen && (
                    <button type="button" className="btn-ghost" aria-label={`„${title}“ öffnen`}
                      onClick={() => onOpen(collection.id, row[keyOf(collection)])}>Öffnen</button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  });
}
