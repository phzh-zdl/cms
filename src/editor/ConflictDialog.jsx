import { useEffect, useRef } from 'react';
import { sameValue } from '../save/merge.js';

// Modaler Dialog fuer einen Eintrag (oder eine Textseite), den beide Seiten unterschiedlich
// geaendert haben. conflict: aus mergeSite; data: zum Anzeigen von Verweisen (Titel statt Kennung).
// onChoose('mine' | 'theirs', fassung), onCancel().

const EMPTY = '(leer)';

function plainText(html) {
  const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
  doc.querySelectorAll('script, style').forEach((el) => el.remove());
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function referenceName(config, data, collectionId, id) {
  const target = config.collections.find((c) => c.id === collectionId);
  const row = (data?.[collectionId] ?? []).find((r) => r[target?.key ?? 'id'] === id);
  const title = row && target ? String(row[target.titleField] ?? '').trim() : '';
  return title || String(id);
}

function display(field, value, config, data) {
  if (value === undefined || value === null || value === '') return EMPTY;
  if (field.type === 'reference' || field.type === 'reference-multi') {
    const ids = Array.isArray(value) ? value : [value];
    return ids.length ? ids.map((id) => referenceName(config, data, field.to, id)).join(', ') : EMPTY;
  }
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
  if (Array.isArray(value)) {
    return value.length ? value.map((v) => (v && typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ') : EMPTY;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Zeilen [{ label, value, raw }] fuer eine Fassung.
function rowsFor(conflict, version, config, data) {
  if (conflict.kind === 'page') {
    return [
      { label: 'Titel', value: version.title ? String(version.title) : EMPTY, raw: version.title },
      { label: 'Text', value: plainText(version.html) || EMPTY, raw: version.html },
    ];
  }
  const collection = config.collections.find((c) => c.id === conflict.collectionId);
  return collection.fields.map((f) => ({ label: f.label ?? f.name, value: display(f, version[f.name], config, data), raw: version[f.name] }));
}

function describe(conflict, config) {
  const entry = conflict.mine ?? conflict.theirs ?? {};
  if (conflict.kind === 'page') {
    const page = config.pages.find((p) => p.id === conflict.pageId);
    return { title: String(entry.title ?? '').trim() || page?.label || conflict.pageId, where: 'Textseiten' };
  }
  const collection = config.collections.find((c) => c.id === conflict.collectionId);
  return { title: String(entry[collection.titleField] ?? '').trim() || String(conflict.id), where: collection.label };
}

function Column({ heading, rows, other }) {
  return (
    <div className="conflict-column">
      <h3>{heading}</h3>
      {rows === null ? <p>(gelöscht)</p> : (
        <ul>
          {rows.map((r, i) => {
            const changed = other !== null && !sameValue(r.raw, other[i].raw);
            return (
              <li key={r.label} className={changed ? 'changed' : undefined}>
                <span className="conflict-label">{r.label}:</span> {r.value}
                {changed && <span className="changed-mark"> – geändert</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ConflictDialog({ conflict, index, total, config, data, onChoose, onCancel }) {
  const dialogRef = useRef(null);
  const firstRef = useRef(null);
  useEffect(() => { firstRef.current?.focus(); }, [conflict]);

  const { title, where } = describe(conflict, config);
  const mineRows = conflict.mine ? rowsFor(conflict, conflict.mine, config, data) : null;
  const theirRows = conflict.theirs ? rowsFor(conflict, conflict.theirs, config, data) : null;

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...dialogRef.current.querySelectorAll('button:not(:disabled)')];
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  return (
    <div className="dialog-backdrop">
      <div ref={dialogRef} className="dialog dialog-wide" role="dialog" aria-modal="true" aria-labelledby="conflict-title" onKeyDown={onKeyDown}>
        <h2 id="conflict-title">Gleichzeitige Änderung</h2>
        <p className="note">Konflikt {index + 1} von {total}</p>
        <p>„{title}“ in {where} wurde inzwischen von jemand anderem geändert. Welche Fassung soll gelten?</p>
        <div className="conflict-columns">
          <Column heading="Meine Version" rows={mineRows} other={theirRows} />
          <Column heading="Die andere Version" rows={theirRows} other={mineRows} />
        </div>
        <div className="dialog-actions">
          <button type="button" ref={firstRef} onClick={() => onChoose('mine', conflict.mine)}>Meine Version übernehmen</button>
          <button type="button" onClick={() => onChoose('theirs', conflict.theirs)}>Die andere Version übernehmen</button>
          <button type="button" onClick={onCancel}>Abbrechen</button>
        </div>
      </div>
    </div>
  );
}
