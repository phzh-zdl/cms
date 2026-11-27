import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import React, { act, useState } from 'react';
import DeleteDialog from './DeleteDialog.jsx';
import CollectionView from './CollectionView.jsx';
import { planDelete, applyDelete } from '../content/deleteRules.js';

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
const click = (el) => act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const select = (el, value) => act(async () => {
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new Event('change', { bubbles: true }));
});
const esc = () => act(async () => {
  document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
});
const btn = (c, text) => [...c.querySelectorAll('button')].find((b) => b.textContent === text);

const options = [{ id: 'kunst', label: 'Kunst' }, { id: 'natur', label: 'Natur' }];
const noop = () => {};

describe('DeleteDialog', () => {
  it('reassign: Dialog-Semantik, Fokus auf Auswahl, Bestätigen erst nach Auswahl', async () => {
    const onConfirm = vi.fn();
    const c = await render(<DeleteDialog plan={{ mode: 'reassign', affected: ['a', 'b', 'c'] }} options={options} onConfirm={onConfirm} onCancel={noop} />);
    const dlg = c.querySelector('[role="dialog"]');
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    expect(dlg.querySelector(`#${dlg.getAttribute('aria-labelledby')}`).textContent).toBeTruthy();
    expect(dlg.textContent).toContain('Dieser Fachbereich wird von 3 Ressourcen verwendet. Wählen Sie, wohin sie verschoben werden:');
    const sel = dlg.querySelector('select');
    expect(document.activeElement).toBe(sel);
    expect(btn(c, 'Löschen').disabled).toBe(true);
    await select(sel, 'kunst');
    expect(btn(c, 'Löschen').disabled).toBe(false);
    await click(btn(c, 'Löschen'));
    expect(onConfirm).toHaveBeenCalledWith({ reassignTo: 'kunst' });
  });
  it('Texte der anderen Modi, Fokus auf Bestätigen', async () => {
    const c = await render(<DeleteDialog plan={{ mode: 'remove', affected: ['a', 'b'] }} options={[]} onConfirm={noop} onCancel={noop} />);
    expect(c.textContent).toContain('Wird aus 2 Ressourcen entfernt.');
    expect(document.activeElement).toBe(btn(c, 'Löschen'));
    await act(async () => root.render(<DeleteDialog plan={{ mode: 'nullify', affected: ['a'] }} options={[]} onConfirm={noop} onCancel={noop} />));
    expect(c.textContent).toContain('1 Ressource verliert diese Lizenz.');
    await act(async () => root.render(<DeleteDialog plan={{ mode: 'free', affected: [] }} options={[]} onConfirm={noop} onCancel={noop} />));
    expect(c.textContent).toContain('Wirklich löschen?');
  });
  it('Esc und Abbrechen schliessen', async () => {
    const onCancel = vi.fn();
    const c = await render(<DeleteDialog plan={{ mode: 'free', affected: [] }} options={[]} onConfirm={noop} onCancel={onCancel} />);
    await esc();
    expect(onCancel).toHaveBeenCalledTimes(1);
    await click(btn(c, 'Abbrechen'));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});

const config = {
  contentRoot: 'public/content',
  collections: [
    {
      id: 'categories', label: 'Fachbereiche', key: 'id', titleField: 'label',
      fields: [{ name: 'id', type: 'slug', label: 'ID', required: true, immutable: true }, { name: 'label', type: 'text', label: 'Name', required: true }],
      onDelete: [{ referencedBy: 'resources.category_id', mode: 'reassign' }],
    },
    {
      id: 'resources', label: 'Ressourcen', key: 'id', titleField: 'title', onDelete: [],
      fields: [{ name: 'id', type: 'uuid' }, { name: 'title', type: 'text', label: 'Titel' }, { name: 'category_id', type: 'reference', to: 'categories', label: 'Fachbereich' }],
    },
  ],
};

function Harness() {
  const [data, setData] = useState({
    categories: [{ id: 'natur', label: 'Natur' }, { id: 'kunst', label: 'Kunst' }],
    resources: [{ id: 'r1', title: 'Eins', category_id: 'natur' }],
  });
  const [original] = useState(data);
  return (
    <CollectionView collection={config.collections[0]} data={data} original={original} collections={config.collections}
      onChange={(rows) => setData((d) => ({ ...d, categories: rows }))}
      planFor={(id) => planDelete(data, config, 'categories', id)}
      onDelete={(id, opts) => setData(applyDelete(data, config, 'categories', id, opts).data)} />
  );
}

describe('Löschen im Formular', () => {
  it('Löschen mit Ziel: Formular zu, Eintrag weg; Esc gibt Fokus an den Löschen-Knopf zurück', async () => {
    const c = await render(<Harness />);
    await click([...c.querySelectorAll('.entry-list button')].find((b) => b.textContent.includes('Natur')));
    const del = btn(c, 'Löschen');
    await click(del);
    expect(c.querySelector('[role="dialog"]')).not.toBeNull();
    await esc();
    expect(c.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(del);
    await click(del);
    await select(c.querySelector('[role="dialog"] select'), 'kunst');
    await click([...c.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent === 'Löschen'));
    expect(c.querySelector('form')).toBeNull();
    expect(c.querySelector('.entry-list').textContent).not.toContain('Natur');
    expect(c.querySelector('.entry-list').textContent).toContain('Kunst');
  });
});
