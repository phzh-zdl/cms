import { useState } from 'react';

// Gerüst: Seitenleiste + Hauptbereich. Echte Listen/Formulare folgen in Task 6.
export default function SiteEditor({ site, onBack }) {
  const { config, data } = site;
  const [current, setCurrent] = useState(() =>
    config.collections[0]
      ? { kind: 'collection', id: config.collections[0].id }
      : config.pages[0] ? { kind: 'page', id: config.pages[0].id } : null);

  const item = current && (current.kind === 'collection'
    ? config.collections.find((c) => c.id === current.id)
    : config.pages.find((p) => p.id === current.id));
  const count = current?.kind === 'collection' ? (data[current.id]?.length ?? 0) : null;

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
        {item && <h1>{item.label}</h1>}
        {count !== null && <p>{count === 1 ? '1 Eintrag' : `${count} Einträge`}</p>}
      </section>
    </div>
  );
}
