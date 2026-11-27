import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SiteEditor from './SiteEditor.jsx';
import { serializeJson } from '../save/serialize.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container, root;
beforeEach(() => { localStorage.clear(); });
afterEach(() => { act(() => root?.unmount()); container?.remove(); container = root = null; });

const categories = {
  id: 'categories', label: 'Fachbereiche', file: 'categories.json', key: 'id', idField: { type: 'slug' }, titleField: 'label',
  fields: [{ name: 'id', type: 'slug', label: 'ID', required: true }, { name: 'label', type: 'text', label: 'Name', required: true }],
  onDelete: [],
};
function makeSite(pages) {
  const data = { categories: [{ id: 'natur', label: 'Natur' }] };
  return {
    repo: 'o/r', headSha: 'head0',
    config: { name: 'Test', contentRoot: 'content', collections: [categories], pages },
    original: { 'content/categories.json': serializeJson(data.categories) },
    data, pages: {},
  };
}
async function render(site) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<SiteEditor site={site} client={{}} onBack={() => {}} />));
  return container;
}
// Gruppe = Ueberschrift + die Liste, die sie per aria-labelledby benennt.
function groups(c) {
  const nav = c.querySelector('nav[aria-label="Inhalte"]');
  return [...nav.querySelectorAll('h2')].map((h) => ({
    heading: h.textContent,
    buttons: [...nav.querySelectorAll(`ul[aria-labelledby="${h.id}"] button`)].map((b) => b.textContent),
  }));
}

describe('SiteEditor Navigation', () => {
  it('gruppiert in Inhalte, Textseiten und abgesetzt Veröffentlichen', async () => {
    const c = await render(makeSite([{ id: 'impressum', label: 'Impressum' }]));
    expect(groups(c)).toEqual([
      { heading: 'Inhalte', buttons: ['Fachbereiche'] },
      { heading: 'Textseiten', buttons: ['Impressum'] },
      { heading: 'Veröffentlichen', buttons: ['Vorschau (neues Fenster)', 'Exportieren', 'Verlauf'] },
    ]);
  });

  it('zeigt Veröffentlichen auch ohne Textseiten, nicht unter einer anderen Gruppe', async () => {
    const c = await render(makeSite([]));
    expect(groups(c).map((g) => g.heading)).toEqual(['Inhalte', 'Veröffentlichen']);
    expect(groups(c)[0].buttons).not.toContain('Exportieren');
  });

  it('behält aria-current auf dem aktiven Punkt', async () => {
    const c = await render(makeSite([]));
    const active = c.querySelector('nav button[aria-current="page"]');
    expect(active.textContent).toBe('Fachbereiche');
  });

  it('setzt die Speicherleiste ans Ende des Inhaltsbereichs', async () => {
    const c = await render(makeSite([]));
    const main = c.querySelector('.editor-main');
    expect(main.lastElementChild.classList.contains('save-bar')).toBe(true);
  });

  it('Vorschau-Knopf ohne Service Worker: Meldung statt Fehler', async () => {
    const c = await render(makeSite([]));
    const btn = [...c.querySelectorAll('nav button')].find((b) => b.textContent === 'Vorschau (neues Fenster)');
    await act(async () => btn.click());
    expect(c.querySelector('[role="alert"]').textContent).toContain('Die Vorschau ist in diesem Browser nicht verfügbar.');
  });

  it('eigenständige Einstellungen: eigene Gruppe vor Veröffentlichen', async () => {
    const site = makeSite([{ id: 'impressum', label: 'Impressum' }]);
    site.config = { ...site.config, settings: [{ name: 'farben', label: 'Farben', file: 'farben.json', fields: [] }], views: [] };
    const c = await render(site);
    expect(groups(c).map((g) => g.heading)).toEqual(['Inhalte', 'Textseiten', 'Einstellungen', 'Veröffentlichen']);
    expect(groups(c)[2].buttons).toEqual(['Farben']);
  });
});
