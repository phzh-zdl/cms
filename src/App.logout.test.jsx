// Abmelden loescht Entwuerfe (final review I3) und ist auch im Wiederholen-Bildschirm moeglich (T3).
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import App from './App.jsx';
import { serializeJson } from './save/serialize.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./github/client.js', async (orig) => {
  const mod = await orig();
  return { ...mod, createClient: vi.fn(() => ({ getUser: async () => ({ login: 'anna', name: 'Anna' }) })) };
});
vi.mock('./content/site.js', async (orig) => ({ ...(await orig()), listSites: vi.fn(async () => []), loadSite: vi.fn() }));
import { createClient, GitHubError } from './github/client.js';
import { loadSite } from './content/site.js';
import { setDraftsLocked } from './save/drafts.js';

const categories = {
  id: 'categories', label: 'Fachbereiche', file: 'categories.json', key: 'id', idField: { type: 'slug' }, titleField: 'label',
  fields: [
    { name: 'id', type: 'slug', label: 'ID', required: true, immutable: true },
    { name: 'label', type: 'text', label: 'Name', required: true },
  ],
};
const ROWS = [{ id: 'natur', label: 'Natur' }];
const SITE = {
  repo: 'phzh-zdl/oer', headSha: 'h0', config: { name: 'Testseite', contentRoot: 'content', collections: [categories], pages: [] },
  original: { 'content/categories.json': serializeJson(ROWS) }, data: { categories: ROWS }, pages: {}, settings: {},
};
const MSG = 'Ungespeicherte Änderungen gehen beim Abmelden verloren. Trotzdem abmelden?';

let container, root;
beforeEach(() => {
  sessionStorage.clear(); localStorage.clear(); window.location.hash = '';
  loadSite.mockReset(); loadSite.mockResolvedValue(SITE);
  setDraftsLocked(false); // Modulzustand: in der echten App beginnt jeder Seitenaufruf entsperrt
});
afterEach(() => { act(() => root?.unmount()); container?.remove(); container = root = null; window.location.hash = ''; });

function render(ui) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(ui));
  return container;
}
const button = (el, text) => [...el.querySelectorAll('button')].find((b) => b.textContent === text);
const click = async (b) => act(async () => b.click());
const draftKeys = () => Object.keys(localStorage).filter((k) => k.startsWith('cms.draft.'));
const dialog = (el) => el.querySelector('[role="dialog"]');
const inDialog = (el, text) => [...dialog(el).querySelectorAll('button')].find((b) => b.textContent === text);
const field = (el, id) => [...el.querySelectorAll('input')].find((i) => i.id === id);
async function type(input, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function openNatur(el) {
  await click([...el.querySelectorAll('.entry-list button')].find((b) => b.textContent.includes('Natur')));
}
// Angemeldet, Editor offen, Eintrag "Natur" geaendert (noch kein Entwurf geschrieben).
async function editing() {
  window.location.hash = '#/phzh-zdl/oer';
  sessionStorage.setItem('cms.token', 't');
  const el = render(<App />);
  await act(async () => {});
  await openNatur(el);
  await type(field(el, 'field-label'), 'Natur und Technik');
  return el;
}

describe('Abmelden', () => {
  it('ohne ungespeicherte Änderungen: kein Dialog', async () => {
    sessionStorage.setItem('cms.token', 't');
    const el = render(<App />);
    await act(async () => {});
    await click(button(el, 'Abmelden'));
    expect(dialog(el)).toBeNull();
    expect(field(el, 'token')).toBeDefined();
  });

  it('mit ungespeicherten Änderungen: Bestätigung; Abmelden löscht alle Entwürfe, auch beim Schliessen des Editors', async () => {
    localStorage.setItem('cms.draft.andere/seite', JSON.stringify({ savedAt: '2026-11-27T10:00:00Z', data: {} }));
    localStorage.setItem('cms.anderes', 'bleibt');
    const el = await editing();
    await click(button(el, 'Abmelden'));
    expect(dialog(el)?.textContent).toContain(MSG);
    expect(el.textContent).toContain('Angemeldet als Anna'); // noch angemeldet
    await click(inDialog(el, 'Abmelden'));
    expect(field(el, 'token')).toBeDefined();
    expect(sessionStorage.getItem('cms.token')).toBeNull();
    expect(draftKeys()).toEqual([]);
    await act(async () => { await new Promise((r) => setTimeout(r, 1100)); }); // auch kein verspaeteter Entwurf
    expect(draftKeys()).toEqual([]);
    expect(localStorage.getItem('cms.anderes')).toBe('bleibt');
  });

  it('Abbrechen: angemeldet, Entwurf bleibt', async () => {
    const el = await editing();
    await click(button(el, 'Zurück zur Seitenauswahl')); // Editor verlassen -> Entwurf geschrieben
    expect(draftKeys()).toEqual(['cms.draft.phzh-zdl/oer']);
    const draft = localStorage.getItem('cms.draft.phzh-zdl/oer');
    await click(button(el, 'Abmelden'));
    expect(dialog(el)?.textContent).toContain(MSG);
    await click(inDialog(el, 'Abbrechen'));
    expect(dialog(el)).toBeNull();
    expect(el.textContent).toContain('Angemeldet als Anna');
    expect(sessionStorage.getItem('cms.token')).toBe('t');
    expect(localStorage.getItem('cms.draft.phzh-zdl/oer')).toBe(draft);
  });

  it('Abbrechen im offenen Editor: Eingabe bleibt', async () => {
    const el = await editing();
    await click(button(el, 'Abmelden'));
    await click(inDialog(el, 'Abbrechen'));
    expect(field(el, 'field-label').value).toBe('Natur und Technik');
    expect(el.textContent).toContain('Ungespeicherte Änderungen');
  });

  it('nach erneuter Anmeldung werden Entwürfe wieder gesichert', async () => {
    const el = await editing();
    await click(button(el, 'Abmelden'));
    await click(inDialog(el, 'Abmelden'));
    await type(field(el, 'token'), 'neu');
    await act(async () => { el.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    await act(async () => {});
    window.location.hash = '';
    loadSite.mockResolvedValue(SITE);
    // Seite aus der Liste ist leer (listSites gemockt) - Editor ueber den Hash oeffnen
    act(() => root.unmount());
    container.remove();
    window.location.hash = '#/phzh-zdl/oer';
    const el2 = render(<App />);
    await act(async () => {});
    await openNatur(el2);
    await type(field(el2, 'field-label'), 'Natur 2');
    await click(button(el2, 'Zurück zur Seitenauswahl'));
    expect(draftKeys()).toEqual(['cms.draft.phzh-zdl/oer']);
  });
});

describe('Wiederholen-Bildschirm', () => {
  it('bietet Abmelden an: Schlüssel weg, Anmeldung sichtbar', async () => {
    localStorage.setItem('cms.token', 'keep');
    createClient.mockImplementationOnce(() => ({ getUser: async () => { throw new GitHubError(0, 'Keine Verbindung.'); } }));
    const el = render(<App />);
    await act(async () => {});
    expect(button(el, 'Erneut versuchen')).toBeDefined();
    await click(button(el, 'Abmelden'));
    expect(localStorage.getItem('cms.token')).toBeNull();
    expect(field(el, 'token')).toBeDefined();
  });
});
