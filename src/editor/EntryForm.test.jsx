import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act, useState } from 'react';
import EntryForm from './EntryForm.jsx';
import CollectionView from './CollectionView.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container, root;
afterEach(() => { act(() => root?.unmount()); container?.remove(); container = root = null; });
async function render(ui) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(ui));
  return container;
}
// React-kompatibel tippen
async function type(el, value) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const categories = {
  id: 'categories', label: 'Fachbereiche', key: 'id', idField: { type: 'slug' }, sortBy: 'sort_order', titleField: 'label',
  fields: [
    { name: 'id', type: 'slug', label: 'ID', required: true, immutable: true },
    { name: 'label', type: 'text', label: 'Name', required: true },
    { name: 'color', type: 'color', label: 'Farbe', required: true },
    { name: 'sort_order', type: 'number', label: 'Reihenfolge' },
  ],
};
const resources = {
  id: 'resources', label: 'Ressourcen', key: 'id', idField: { type: 'uuid' }, titleField: 'title',
  fields: [
    { name: 'title', type: 'text', label: 'Titel', required: true },
    { name: 'description', type: 'textarea', label: 'Beschreibung', maxLength: 500 },
    { name: 'category_id', type: 'reference', to: 'categories', label: 'Fachbereich', required: true },
    { name: 'license_id', type: 'reference', to: 'categories', label: 'Lizenz' },
    { name: 'format_ids', type: 'reference-multi', to: 'categories', label: 'Formate', required: true },
    { name: 'image', type: 'image', label: 'Bild' },
  ],
};
const data = {
  categories: [{ id: 'natur', label: 'Natur', color: '#112233', sort_order: 1 }, { id: 'kunst', label: 'Kunst', color: '#445566', sort_order: 2 }],
  resources: [],
};
const collections = [categories, resources];
const base = { data, collections, onChange: () => {}, onBack: () => {} };

describe('EntryForm', () => {
  it('zeigt Fehler unter dem leeren Titelfeld, beschriftet per label for', async () => {
    const c = await render(<EntryForm {...base} collection={resources} entry={{ id: 'u1', title: '', description: '', category_id: null, format_ids: [] }} isNew />);
    const input = c.querySelector('input#field-title');
    expect(c.querySelector('label[for="field-title"]').textContent).toContain('Titel');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const err = c.querySelector(`#${input.getAttribute('aria-describedby')}`);
    expect(err.textContent).toBe('Pflichtfeld.');
  });
  it('Zeichenzaehler und Referenz-Optionen', async () => {
    const c = await render(<EntryForm {...base} collection={resources} entry={{ id: 'u1', title: 'x', description: 'abc', category_id: null, format_ids: [] }} isNew />);
    const counter = c.querySelector('[aria-live="polite"]');
    expect(counter.textContent).toBe('3 / 500');
    const sel = c.querySelector('select#field-category_id');
    expect([...sel.options].map((o) => o.textContent)).toEqual(['— bitte wählen —', 'Kunst', 'Natur']);
    const opt = c.querySelector('select#field-license_id');
    expect([...opt.options].map((o) => o.textContent)).toEqual(['— keine Auswahl —', 'Kunst', 'Natur']);
    expect(c.querySelector('fieldset legend').textContent).toContain('Formate');
    expect(c.textContent).toContain('Bild wählen');
  });
  it('reference-multi required: Fehler bis ein Haken gesetzt ist', async () => {
    const onChange = vi.fn();
    const c = await render(<EntryForm {...base} onChange={onChange} collection={resources} entry={{ id: 'u1', title: 'x', description: '', category_id: 'natur', format_ids: [] }} isNew />);
    const fs = c.querySelector('fieldset');
    expect(fs.textContent).toContain('Pflichtfeld.');
    await act(async () => fs.querySelector('input[type=checkbox]').click());
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ format_ids: ['kunst'] }));
  });
  it('bestehender Eintrag: Slug als Text mit Hinweis, kein Eingabefeld', async () => {
    const c = await render(<EntryForm {...base} collection={categories} entry={data.categories[0]} isNew={false} />);
    expect(c.querySelector('input[id="field-id"]')).toBeNull();
    const dl = c.querySelector('dl.field-fixed');
    expect(dl.querySelector('dt').textContent).toBe('ID');
    expect(dl.querySelector('dd').textContent).toBe('natur');
    expect(dl.querySelector('dd').id).toBe('field-id');
    expect(dl.nextElementSibling.textContent)
      .toBe('Wurde beim Anlegen festgelegt und kann nicht mehr geändert werden, weil andere Einträge darauf verweisen.');
    expect(dl.querySelector('[aria-describedby]')).toBeNull();
  });
  it('UUID: immer als Text mit Hinweis, auch bei neuen Eintraegen', async () => {
    for (const isNew of [true, false]) {
      const c = await render(<EntryForm {...base} collection={{ ...resources, fields: [{ name: 'id', type: 'uuid', label: 'ID' }, ...resources.fields] }}
        entry={{ id: 'u-123', title: 'x', description: '', category_id: 'natur', format_ids: ['natur'] }} isNew={isNew} />);
      expect(c.querySelector('input[id="field-id"]')).toBeNull();
      expect(c.querySelector('[id="field-id"]').textContent).toContain('u-123');
      expect(c.textContent).toContain('Wird automatisch vergeben und kann nicht geändert werden.');
    }
  });
  it('neuer Eintrag: Slug wird aus Name vorgeschlagen, bis er von Hand geaendert wird', async () => {
    let entry = { id: '', label: '', color: '', sort_order: null };
    const onChange = vi.fn((next) => { entry = next; });
    const props = { ...base, onChange, collection: categories, isNew: true };
    const c = await render(<EntryForm {...props} entry={entry} />);
    const rerender = () => act(async () => root.render(<EntryForm {...props} entry={entry} />));
    const id = () => c.querySelector('input[id="field-id"]');
    expect(c.querySelector(`[id="${id().getAttribute("aria-describedby").split(" ")[0]}"]`).textContent)
      .toBe('Wird aus der Bezeichnung vorgeschlagen und kann vor dem ersten Speichern angepasst werden. Danach ist sie fest.');
    await type(c.querySelector('input#field-label'), 'Natur');
    await rerender();
    expect(id().value).toBe('natur');
    await type(id(), 'nat');
    await rerender();
    await type(c.querySelector('input#field-label'), 'Natur und Technik');
    await rerender();
    expect(id().value).toBe('nat');
    expect(entry).toMatchObject({ id: 'nat', label: 'Natur und Technik' });
  });
  it('neuer Eintrag: Slug wird aus Name abgeleitet und ist editierbar', async () => {
    const onChange = vi.fn();
    const c = await render(<EntryForm {...base} onChange={onChange} collection={categories} entry={{ id: '', label: '', color: '', sort_order: null }} isNew />);
    expect(c.querySelector('input[id="field-id"]').readOnly).toBe(false);
    await type(c.querySelector('input#field-label'), 'Natur, Mensch & Gesellschaft');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'natur-mensch-gesellschaft', label: 'Natur, Mensch & Gesellschaft' }));
  });
  it('Farbe: Textfeld und Farbwaehler', async () => {
    const c = await render(<EntryForm {...base} collection={categories} entry={data.categories[0]} isNew={false} />);
    expect(c.querySelector('input[type=color]').getAttribute('aria-label')).toMatch(/Farbe/);
    expect(c.querySelector('input#field-color').value).toBe('#112233');
  });
});

describe('CollectionView', () => {
  const initial = [
    { id: 'b', label: 'Zeta', color: '#112233', sort_order: 2 },
    { id: 'a', label: 'Alpha', color: 'kaputt', sort_order: 10 },
    { id: 'c', label: 'Beta', color: '#112233', sort_order: 1 },
  ];
  function Harness({ onRows }) {
    const [rows, setRows] = useState(initial);
    return (
      <CollectionView
        collection={categories} data={{ categories: rows }} original={{ categories: initial }}
        collections={collections}
        onChange={(r) => { setRows(r); onRows?.(r); }}
      />
    );
  }

  it('sortiert nach sortBy numerisch, markiert Fehler mit Text, filtert per Suche', async () => {
    const c = await render(<Harness />);
    const list = () => [...c.querySelectorAll('ul.entry-list > li > button')].map((b) => b.textContent);
    expect(list()).toEqual(['Beta', 'Zeta', 'AlphaFehler']);
    await type(c.querySelector('input[type=search]'), 'ZET');
    expect(list()).toEqual(['Zeta']);
    expect(c.querySelector('label[for]').textContent).toBe('Suchen');
  });
  it('Neu legt einen Eintrag an, oeffnet das Formular; Zurueck zeigt ihn in der Liste', async () => {
    const onRows = vi.fn();
    const c = await render(<Harness onRows={onRows} />);
    const btn = (t) => [...c.querySelectorAll('button')].find((b) => b.textContent === t);
    await act(async () => btn('Neu').click());
    expect(onRows).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: '', label: '', sort_order: null })]));
    expect(c.querySelector('input#field-label')).not.toBeNull();
    await act(async () => btn('Zurück zur Liste').click());
    expect(c.textContent).toContain('(ohne Titel)');
  });

  // Final review I2: das offene Formular folgt dem Eintrag, nicht der Position in der Liste.
  function Movable({ expose }) {
    const [rows, setRows] = useState(initial);
    expose.rows = rows;
    expose.setRows = setRows;
    return (
      <CollectionView collection={categories} data={{ categories: rows }} original={{ categories: initial }}
        collections={collections} onChange={setRows} />
    );
  }
  const openTitled = async (c, title) => act(async () =>
    [...c.querySelectorAll('.entry-list button')].find((b) => b.textContent.startsWith(title)).click());

  it('Reihenfolge aendert sich bei offenem Formular: Eingaben gehen weiter an denselben Eintrag', async () => {
    const x = {};
    const c = await render(<Movable expose={x} />);
    await openTitled(c, 'Alpha'); // Position 1
    await act(async () => x.setRows((r) => [r[2], { id: 'n', label: 'Neu von B', color: '#112233' }, r[0], r[1]]));
    expect(c.querySelector('input#field-label').value).toBe('Alpha');
    await type(c.querySelector('input#field-label'), 'Alpha 2');
    expect(x.rows.map((r) => r.label)).toEqual(['Beta', 'Neu von B', 'Zeta', 'Alpha 2']);
  });
  it('neuer Eintrag ohne Kennung: Formular bleibt bei ihm, auch wenn die Reihenfolge sich aendert', async () => {
    const x = {};
    const c = await render(<Movable expose={x} />);
    await act(async () => [...c.querySelectorAll('button')].find((b) => b.textContent === 'Neu').click());
    await act(async () => x.setRows((r) => [r[3], ...r.slice(0, 3)])); // Kennung noch leer
    await type(c.querySelector('input#field-label'), 'Gamma');
    expect(x.rows[0]).toEqual(expect.objectContaining({ id: 'gamma', label: 'Gamma' }));
    await act(async () => x.setRows((r) => [...r.slice(1), r[0]])); // jetzt ueber die Kennung
    await type(c.querySelector('input#field-label'), 'Gamma 2');
    expect(x.rows.map((r) => r.label)).toEqual(['Zeta', 'Alpha', 'Beta', 'Gamma 2']);
  });
  it('neuer Eintrag mit doppelt getippter Kennung: Formular bleibt beim neuen Eintrag', async () => {
    const x = {};
    const c = await render(<Movable expose={x} />);
    await act(async () => [...c.querySelectorAll('button')].find((b) => b.textContent === 'Neu').click());
    // (querySelector findet die Felder hier nach den vorigen Tests nicht zuverlaessig - jsdom-Selektor-Cache)
    const input = (id) => [...c.querySelectorAll('input')].find((i) => i.id === id);
    await type(input('field-id'), 'a'); // gibt es schon (Alpha)
    await type(input('field-label'), 'Doppelt');
    expect(x.rows.map((r) => r.label)).toEqual(['Zeta', 'Alpha', 'Beta', 'Doppelt']);
  });
  it('offener Eintrag verschwindet (von jemand anderem geloescht): Formular zu, Hinweis', async () => {
    const x = {};
    const c = await render(<Movable expose={x} />);
    await openTitled(c, 'Alpha');
    await act(async () => x.setRows((r) => r.filter((row) => row.id !== 'a')));
    expect(c.querySelector('input#field-label')).toBeNull();
    const note = c.querySelector('[role="status"]');
    expect(note?.textContent).toBe('Dieser Eintrag wurde inzwischen gelöscht.');
    expect(x.rows.map((r) => r.label)).toEqual(['Zeta', 'Beta']);
  });
});
