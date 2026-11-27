import { useState } from 'react';
import CollectionView from '../editor/CollectionView.jsx';
import { planDelete, applyDelete } from '../content/deleteRules.js';

// Seitenleiste + Hauptbereich. Der Arbeitsstand (data) lebt hier; Textseiten folgen später.
export default function SiteEditor({ site, onBack }) {
  const { config } = site;
  const [data, setData] = useState(() => structuredClone(site.data));
  // Dateien (volle Repo-Pfade), die beim Speichern geloescht werden muessen (Task 8).
  const [removedFiles, setRemovedFiles] = useState([]);
  const [current, setCurrent] = useState(() =>
    config.collections[0]
      ? { kind: 'collection', id: config.collections[0].id }
      : config.pages[0] ? { kind: 'page', id: config.pages[0].id } : null);

  const item = current && (current.kind === 'collection'
    ? config.collections.find((c) => c.id === current.id)
    : config.pages.find((p) => p.id === current.id));

  const navButton = (kind, entry) => {
    const active = current?.kind === kind && current.id === entry.id;
    return (
      <li key={`${kind}:${entry.id}`}>
        <button type="button" aria-current={active ? 'page' : undefined} onClick={() => setCurrent({ kind, id: entry.id })}>
          {entry.label}
        </button>
      </li>
    );
  };

  return (
    <div className="editor">
      <aside className="editor-side">
        <button type="button" onClick={onBack}>Zurück zur Seitenauswahl</button>
        <p className="site-name">{config.name}</p>
        <nav aria-label="Inhalte">
          <ul>{config.collections.map((c) => navButton('collection', c))}</ul>
          {config.pages.length > 0 && (
            <>
              <h2>Textseiten</h2>
              <ul>{config.pages.map((p) => navButton('page', p))}</ul>
            </>
          )}
        </nav>
      </aside>
      <section className="editor-main">
        {current?.kind === 'collection' && item && (
          <CollectionView key={item.id} collection={item} data={data} original={site.data}
            collections={config.collections}
            planFor={(id) => planDelete(data, config, item.id, id)}
            onDelete={(id, opts) => {
              const result = applyDelete(data, config, item.id, id, opts);
              setData(result.data);
              setRemovedFiles((files) => [...new Set([...files, ...result.removedFiles])]);
            }}
            onChange={(rows) => setData((d) => ({ ...d, [item.id]: rows }))} />
        )}
        {current?.kind === 'page' && item && <h1>{item.label}</h1>}
      </section>
    </div>
  );
}
