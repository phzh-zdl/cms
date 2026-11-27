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
  it('bestehender Eintrag: Slug schreibgeschuetzt', async () => {
    const c = await render(<EntryForm {...base} collection={categories} entry={data.categories[0]} isNew={false} />);
    expect(c.querySelector('input#field-id').readOnly).toBe(true);
  });
  it('neuer Eintrag: Slug wird aus Name abgeleitet und ist editierbar', async () => {
    const onChange = vi.fn();
    const c = await render(<EntryForm {...base} onChange={onChange} collection={categories} entry={{ id: '', label: '', color: '', sort_order: null }} isNew />);
    expect(c.querySelector('input#field-id').readOnly).toBe(false);
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
});
