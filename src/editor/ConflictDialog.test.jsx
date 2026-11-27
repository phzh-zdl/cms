import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import ConflictDialog from './ConflictDialog.jsx';

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
const esc = () => act(async () => {
  document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
});
const btn = (c, text) => [...c.querySelectorAll('button')].find((b) => b.textContent === text);

const config = {
  collections: [
    { id: 'categories', label: 'Fachbereiche', key: 'id', titleField: 'label', fields: [{ name: 'label', type: 'text', label: 'Name' }] },
    {
      id: 'resources', label: 'Ressourcen', key: 'id', titleField: 'title',
      fields: [
        { name: 'title', type: 'text', label: 'Titel' },
        { name: 'category', type: 'reference', to: 'categories', label: 'Fachbereich' },
        { name: 'tags', type: 'text', label: 'Stichworte' },
      ],
    },
  ],
  pages: [{ id: 'imp', label: 'Impressum' }],
};
const data = { categories: [{ id: 'natur', label: 'Natur' }, { id: 'kunst', label: 'Kunst' }] };
const conflict = {
  kind: 'collection', collectionId: 'resources', id: 'r1',
  mine: { id: 'r1', title: 'Wald', category: 'natur', tags: ['a', 'b'] },
  theirs: { id: 'r1', title: 'Wald', category: 'kunst', tags: ['a', 'b'] },
};
const GIT_WORDS = /commit|merge|branch|\bsha\b/i;

describe('ConflictDialog', () => {
  it('Dialog-Semantik, Texte, Fokus, Unterschiede markiert, keine Git-Begriffe', async () => {
    const c = await render(<ConflictDialog conflict={conflict} index={0} total={3} config={config} data={data} onChoose={() => {}} onCancel={() => {}} />);
    const dlg = c.querySelector('[role="dialog"]');
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    expect(dlg.querySelector(`#${dlg.getAttribute('aria-labelledby')}`).textContent).toBe('Gleichzeitige Änderung');
    expect(dlg.textContent).toContain('„Wald“ in Ressourcen wurde inzwischen von jemand anderem geändert. Welche Fassung soll gelten?');
    expect(dlg.textContent).toContain('Konflikt 1 von 3');
    expect(dlg.textContent).toContain('Meine Version');
    expect(dlg.textContent).toContain('Die andere Version');
    expect(dlg.textContent).toContain('Fachbereich: Natur');
    expect(dlg.textContent).toContain('Fachbereich: Kunst');
    expect(dlg.textContent).toContain('Stichworte: a, b');
    expect(document.activeElement).toBe(btn(c, 'Meine Version übernehmen'));
    // "geändert" nur am unterschiedlichen Feld, auf beiden Seiten
    const marked = [...dlg.querySelectorAll('li')].filter((li) => li.textContent.includes('geändert'));
    expect(marked).toHaveLength(2);
    for (const li of marked) expect(li.textContent).toContain('Fachbereich');
    expect(dlg.textContent).not.toMatch(GIT_WORDS);
  });

  it('Klick auf "Meine Version übernehmen" liefert die eigene Fassung', async () => {
    const onChoose = vi.fn();
    const c = await render(<ConflictDialog conflict={conflict} index={0} total={1} config={config} data={data} onChoose={onChoose} onCancel={() => {}} />);
    await click(btn(c, 'Meine Version übernehmen'));
    expect(onChoose).toHaveBeenCalledWith('mine', conflict.mine);
    await click(btn(c, 'Die andere Version übernehmen'));
    expect(onChoose).toHaveBeenLastCalledWith('theirs', conflict.theirs);
  });

  it('Esc und "Abbrechen" brechen ab', async () => {
    const onCancel = vi.fn();
    const c = await render(<ConflictDialog conflict={conflict} index={0} total={1} config={config} data={data} onChoose={() => {}} onCancel={onCancel} />);
    await esc();
    expect(onCancel).toHaveBeenCalledTimes(1);
    await click(btn(c, 'Abbrechen'));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('geloeschte Seite wird als "(gelöscht)" gezeigt', async () => {
    const c = await render(<ConflictDialog conflict={{ ...conflict, mine: null }} index={1} total={2} config={config} data={data} onChoose={() => {}} onCancel={() => {}} />);
    expect(c.textContent).toContain('(gelöscht)');
    expect(c.textContent).toContain('Konflikt 2 von 2');
    expect(c.textContent).toContain('„Wald“ in Ressourcen');
  });

  it('Textseite: Titel und Text ohne HTML', async () => {
    const page = {
      kind: 'page', pageId: 'imp',
      mine: { id: 'imp', title: 'Impressum', html: '<p>Mein <strong>Text</strong></p><script>x</script>' },
      theirs: { id: 'imp', title: 'Impressum', html: '<p>Ihr Text</p>' },
    };
    const c = await render(<ConflictDialog conflict={page} index={0} total={1} config={config} data={data} onChoose={() => {}} onCancel={() => {}} />);
    const dlg = c.querySelector('[role="dialog"]');
    expect(dlg.textContent).toContain('„Impressum“ in Textseiten wurde inzwischen');
    expect(dlg.textContent).toContain('Mein Text');
    expect(dlg.textContent).toContain('Ihr Text');
    expect(dlg.querySelector('strong')).toBeNull();
    expect(dlg.querySelector('script')).toBeNull();
    expect(dlg.textContent).not.toMatch(GIT_WORDS);
  });
});
