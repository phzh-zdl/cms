import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SiteEditor from './SiteEditor.jsx';
import { serializeJson } from '../save/serialize.js';
import { AuthError } from '../github/client.js';
import { loadDraft } from '../save/drafts.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container, root;
beforeEach(() => { localStorage.clear(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); act(() => root?.unmount()); container?.remove(); container = root = null; });

async function render(ui) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(ui));
  return container;
}
async function type(el, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const button = (c, text) => [...c.querySelectorAll('button')].find((b) => b.textContent === text);
const click = async (el) => act(async () => el.click());

const categories = {
  id: 'categories', label: 'Fachbereiche', file: 'categories.json', key: 'id', idField: { type: 'slug' }, titleField: 'label',
  fields: [
    { name: 'id', type: 'slug', label: 'ID', required: true, immutable: true },
    { name: 'label', type: 'text', label: 'Name', required: true },
  ],
  onDelete: [],
};
function makeSite() {
  const data = { categories: [{ id: 'natur', label: 'Natur' }] };
  return {
    repo: 'o/r',
    headSha: 'head0',
    config: { name: 'Test', contentRoot: 'content', collections: [categories], pages: [] },
    original: { 'content/categories.json': serializeJson(data.categories) },
    data,
    pages: {},
  };
}
function fakeClient(fail = {}) {
  const calls = [];
  const step = (name, result) => async (...a) => {
    calls.push([name, ...a]);
    if (fail[name]) throw fail[name];
    return result;
  };
  let head = 'head0'; // Stand von main: folgt jeder erfolgreichen Speicherung
  return {
    calls,
    getRef: async (...a) => { calls.push(['getRef', ...a]); return head; },
    getCommit: step('getCommit', { treeSha: 'tree0' }),
    getTree: step('getTree', [{ path: 'content/categories.json', type: 'blob', sha: 'x', mode: '100644' }]),
    createBlob: step('createBlob', 'blob1'),
    createTree: step('createTree', 'tree1'),
    createCommit: step('createCommit', 'commit1'),
    updateRef: async (...a) => { await step('updateRef', undefined)(...a); head = a[2]; },
  };
}

describe('SiteEditor speichern', () => {
  it('blockiert das Speichern bei Fehlern und nennt die Sammlung', async () => {
    const client = fakeClient();
    const c = await render(<SiteEditor site={makeSite()} client={client} onBack={() => {}} />);
    expect(c.textContent).toContain('Alle Änderungen gespeichert.');
    await click(button(c, 'Neu'));
    expect(c.textContent).toContain('Ungespeicherte Änderungen');
    const save = button(c, 'Speichern');
    expect(save.disabled).toBe(false);
    await click(save);
    const alert = c.querySelector('[role="alert"]');
    expect(alert.textContent).toContain('Bitte zuerst die markierten Fehler beheben.');
    expect(alert.textContent).toContain('Fachbereiche');
    expect(client.calls).toEqual([]);
  });

  it('nach dem Speichern: neue Basis, Kennung schreibgeschuetzt, Entwurf weg', async () => {
    const client = fakeClient();
    const c = await render(<SiteEditor site={makeSite()} client={client} onBack={() => {}} />);
    await click(button(c, 'Neu'));
    await type(c.querySelector('#field-label'), 'Sport');
    expect(c.querySelector('#field-id').value).toBe('sport');
    expect(c.querySelector('#field-id').readOnly).toBe(false);
    await click(button(c, 'Speichern'));
    expect(c.querySelector('[role="status"]').textContent).toContain('Gespeichert.');
    expect(c.textContent).toContain('Alle Änderungen gespeichert.');
    expect(c.querySelector('#field-id').readOnly).toBe(true);
    const commit = client.calls.find((x) => x[0] === 'createCommit');
    expect(commit).toEqual(['createCommit', 'o/r', 'Fachbereich „Sport“ hinzugefügt', 'tree1', 'head0']);
    expect(client.calls.find((x) => x[0] === 'updateRef')).toEqual(['updateRef', 'o/r', 'main', 'commit1']);
    expect(localStorage.getItem('cms.draft.o/r')).toBeNull();
    // zurueck zur Liste und wieder oeffnen: weiterhin schreibgeschuetzt
    await click(button(c, 'Zurück zur Liste'));
    await click([...c.querySelectorAll('.entry-list button')].find((b) => b.textContent.includes('Sport')));
    expect(c.querySelector('#field-id').readOnly).toBe(true);
    // naechstes Speichern baut auf dem neuen Stand auf
    await type(c.querySelector('#field-label'), 'Sport und Bewegung');
    await click(button(c, 'Speichern'));
    const commits = client.calls.filter((x) => x[0] === 'createCommit');
    expect(commits[1]).toEqual(['createCommit', 'o/r', 'Fachbereich „Sport und Bewegung“ geändert', 'tree1', 'commit1']);
  });

  it('AuthError: Entwurf bleibt, genaue Meldung', async () => {
    const client = fakeClient({ createBlob: new AuthError(401, 'x') });
    const c = await render(<SiteEditor site={makeSite()} client={client} onBack={() => {}} />);
    await click([...c.querySelectorAll('.entry-list button')].find((b) => b.textContent.includes('Natur')));
    await type(c.querySelector('#field-label'), 'Natur und Technik');
    await click(button(c, 'Speichern'));
    expect(c.querySelector('[role="alert"]').textContent)
      .toBe('Ihr Zugangsschlüssel ist abgelaufen oder ungültig. Ihre Änderungen sind als Entwurf gesichert.');
    const draft = JSON.parse(localStorage.getItem('cms.draft.o/r'));
    expect(draft.baseSha).toBe('head0');
    expect(draft.data.categories[0].label).toBe('Natur und Technik');
    expect(c.textContent).toContain('Ungespeicherte Änderungen');
  });

  it('bietet einen vorhandenen Entwurf zur Wiederherstellung an', async () => {
    localStorage.setItem('cms.draft.o/r', JSON.stringify({
      savedAt: '2026-11-27T10:00:00.000Z', baseSha: 'head0',
      data: { categories: [{ id: 'natur', label: 'Aus dem Entwurf' }] }, pages: {}, removedFiles: [], newImages: [],
    }));
    const c = await render(<SiteEditor site={makeSite()} client={fakeClient()} onBack={() => {}} />);
    expect(c.textContent).toContain('Es gibt ungespeicherte Änderungen vom ');
    expect(c.textContent).toContain('Wiederherstellen?');
    await click(button(c, 'Wiederherstellen'));
    expect(c.textContent).toContain('Aus dem Entwurf');
    expect(c.textContent).toContain('Ungespeicherte Änderungen');
  });

  it('Entwurf verwerfen loescht ihn', async () => {
    localStorage.setItem('cms.draft.o/r', JSON.stringify({
      savedAt: '2026-11-27T10:00:00.000Z', baseSha: 'head0',
      data: { categories: [{ id: 'natur', label: 'Aus dem Entwurf' }] }, pages: {}, removedFiles: [], newImages: [],
    }));
    const c = await render(<SiteEditor site={makeSite()} client={fakeClient()} onBack={() => {}} />);
    await click(button(c, 'Verwerfen'));
    expect(localStorage.getItem('cms.draft.o/r')).toBeNull();
    expect(c.textContent).toContain('Natur');
    expect(c.textContent).not.toContain('Aus dem Entwurf');
  });

  // updateRef haengt, bis release() aufgerufen wird
  function heldClient() {
    const client = fakeClient();
    let release;
    const held = new Promise((r) => { release = r; });
    client.updateRef = async (...a) => { client.calls.push(['updateRef', ...a]); await held; };
    return { client, release: () => release() };
  }
  const openNatur = async (c) =>
    click([...c.querySelectorAll('.entry-list button')].find((b) => b.textContent.includes('Natur')));

  it('Aenderung waehrend des Speicherns bleibt ungespeichert und im Entwurf', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { client, release } = heldClient();
    const c = await render(<SiteEditor site={makeSite()} client={client} onBack={() => {}} />);
    await openNatur(c);
    await type(c.querySelector('#field-label'), 'A');
    await click(button(c, 'Speichern'));
    expect(c.textContent).toContain('Wird gespeichert …');
    await type(c.querySelector('#field-label'), 'B');
    await act(async () => release());
    expect(c.querySelector('#field-label').value).toBe('B');
    expect(c.textContent).toContain('Ungespeicherte Änderungen');
    await act(async () => vi.advanceTimersByTime(1100));
    const draft = loadDraft('o/r');
    expect(draft.data.categories[0].label).toBe('B');
    expect(draft.baseSha).toBe('commit1');
  });

  it('Verlassen waehrend des Speicherns: Entwurf mit der neueren Aenderung bleibt', async () => {
    const { client, release } = heldClient();
    const c = await render(<SiteEditor site={makeSite()} client={client} onBack={() => {}} />);
    await openNatur(c);
    await type(c.querySelector('#field-label'), 'A');
    await click(button(c, 'Speichern'));
    await type(c.querySelector('#field-label'), 'B');
    act(() => root.unmount());
    root = null;
    await act(async () => release());
    const draft = loadDraft('o/r');
    expect(draft.data.categories[0].label).toBe('B');
    expect(draft.baseSha).toBe('commit1');
  });

  it('Verlassen waehrend des Speicherns ohne neuere Aenderung: kein veralteter Entwurf', async () => {
    const { client, release } = heldClient();
    const c = await render(<SiteEditor site={makeSite()} client={client} onBack={() => {}} />);
    await openNatur(c);
    await type(c.querySelector('#field-label'), 'A');
    await click(button(c, 'Speichern'));
    act(() => root.unmount());
    root = null;
    await act(async () => release());
    expect(loadDraft('o/r')).toBeNull();
  });

  it('voller Speicher + AuthError: ehrliche Meldung', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('voll', 'QuotaExceededError'); });
    const client = fakeClient({ createBlob: new AuthError(401, 'x') });
    const c = await render(<SiteEditor site={makeSite()} client={client} onBack={() => {}} />);
    await openNatur(c);
    await type(c.querySelector('#field-label'), 'Natur und Technik');
    await click(button(c, 'Speichern'));
    expect(c.querySelector('[role="alert"]').textContent)
      .toBe('Ihr Zugangsschlüssel ist abgelaufen oder ungültig. Ihre Änderungen konnten nicht als Entwurf gesichert werden – bitte diese Seite nicht schliessen.');
  });

  it('voller Speicher + anderer Fehler: ehrliche Meldung', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('voll', 'QuotaExceededError'); });
    const client = fakeClient({ createBlob: new Error('kaputt') });
    const c = await render(<SiteEditor site={makeSite()} client={client} onBack={() => {}} />);
    await openNatur(c);
    await type(c.querySelector('#field-label'), 'Natur und Technik');
    await click(button(c, 'Speichern'));
    expect(c.querySelector('[role="alert"]').textContent)
      .toBe('Speichern fehlgeschlagen. Ihre Änderungen konnten nicht als Entwurf gesichert werden – bitte diese Seite nicht schliessen.');
  });
});
