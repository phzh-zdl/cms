import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SiteEditor from './SiteEditor.jsx';
import { serializeJson } from '../save/serialize.js';
import { ConflictError } from '../github/client.js';
import { loadDraft } from '../save/drafts.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container, root;
beforeEach(() => { localStorage.clear(); });
afterEach(() => { act(() => root?.unmount()); container?.remove(); container = root = null; });

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
const openEntry = async (c, title) =>
  click([...c.querySelectorAll('.entry-list button')].find((b) => b.textContent.includes(title)));

const PATH = 'content/categories.json';
const categories = {
  id: 'categories', label: 'Fachbereiche', file: 'categories.json', key: 'id', idField: { type: 'slug' }, titleField: 'label',
  fields: [
    { name: 'id', type: 'slug', label: 'ID', required: true, immutable: true },
    { name: 'label', type: 'text', label: 'Name', required: true },
  ],
  onDelete: [],
};
const config = { name: 'Test', contentRoot: 'content', collections: [categories], pages: [] };
const NATUR = { id: 'natur', label: 'Natur' };
const KUNST = { id: 'kunst', label: 'Kunst' };

function makeSite(rows = [NATUR, KUNST], headSha = 'head0') {
  return { repo: 'o/r', headSha, config, original: { [PATH]: serializeJson(rows) }, data: { categories: rows }, pages: {} };
}

// Ein kleines Repo im Speicher. otherSaves: so viele updateRef-Aufrufe scheitern, weil "jemand anderes"
// gerade gespeichert hat (head wird dann auf otherHeads[i] gesetzt).
function repoClient({ head = 'head0', contents, otherHeads = [], author = { name: 'Anna Muster', login: 'anna' }, commitsFail = false }) {
  const state = { head, calls: [], blobs: [], commitNo: 0 };
  const call = (name, ...a) => state.calls.push([name, ...a]);
  const textAt = (ref, path) => (contents[ref] ?? contents.default)?.[path];
  return {
    state,
    calls: state.calls,
    getRef: async (...a) => { call('getRef', ...a); return state.head; },
    getFileText: async (repo, path, ref) => {
      call('getFileText', repo, path, ref);
      const text = textAt(ref, path);
      return text === undefined ? null : { text, sha: 'x' };
    },
    listCommits: async (...a) => {
      call('listCommits', ...a);
      if (commitsFail) throw new Error('weg');
      return [{ sha: state.head, message: 'm', author, date: null }];
    },
    getCommit: async (...a) => { call('getCommit', ...a); return { treeSha: `tree-${a[1]}` }; },
    getTree: async (...a) => { call('getTree', ...a); return [{ path: PATH, type: 'blob', sha: 'x', mode: '100644' }]; },
    createBlob: async (repo, bytes) => { call('createBlob', repo); state.blobs.push(new TextDecoder().decode(bytes)); return `blob${state.blobs.length}`; },
    createTree: async (...a) => { call('createTree', ...a); return 'treeN'; },
    createCommit: async (...a) => { call('createCommit', ...a); state.commitNo += 1; return `commit${state.commitNo}`; },
    updateRef: async (repo, branch, sha) => {
      call('updateRef', repo, branch, sha);
      if (otherHeads.length > 0) {
        state.head = otherHeads.shift();
        throw new ConflictError(409, 'x');
      }
      state.head = sha;
    },
  };
}
const commits = (client) => client.calls.filter((x) => x[0] === 'createCommit');
const lastSaved = (client) => JSON.parse(client.state.blobs.at(-1));

describe('SiteEditor: gleichzeitige Aenderungen', () => {
  it('ConflictError, verschiedene Eintraege: zusammengefuehrt und automatisch gespeichert', async () => {
    const client = repoClient({
      contents: { head1: { 'cms.json': '{}', [PATH]: serializeJson([NATUR, { id: 'kunst', label: 'Kunst und Musik' }]) } },
      otherHeads: ['head1'],
    });
    const c = await render(<SiteEditor site={makeSite()} client={client} onBack={() => {}} />);
    await openEntry(c, 'Natur');
    await type(c.querySelector('#field-label'), 'Natur und Technik');
    await click(button(c, 'Speichern'));

    expect(c.querySelector('[role="dialog"]')).toBeNull();
    const cs = commits(client);
    expect(cs).toHaveLength(2);
    expect(cs[0][4]).toBe('head0');
    expect(cs[1][4]).toBe('head1');
    expect(cs[1][2]).toBe('Fachbereich „Natur und Technik“ geändert');
    expect(lastSaved(client)).toEqual([{ id: 'natur', label: 'Natur und Technik' }, { id: 'kunst', label: 'Kunst und Musik' }]);
    expect(client.state.head).toBe('commit2');
    // Basis war schon geladen: kein erneutes Laden von head0
    expect(client.calls.some((x) => x[0] === 'getFileText' && x[3] === 'head0')).toBe(false);
    expect(c.textContent).toContain('Gespeichert.');
    expect(c.textContent).toContain('Diese Seite wurde seit dem Öffnen von Anna Muster geändert.');
    expect(c.textContent).toContain('Alle Änderungen gespeichert.');
    expect(loadDraft('o/r')).toBeNull();
    await click(button(c, 'Zurück zur Liste'));
    expect(c.querySelector('.entry-list').textContent).toContain('Kunst und Musik');
  });

  it('derselbe Eintrag: Dialog, "Meine Version" wird gespeichert', async () => {
    const client = repoClient({
      contents: { head1: { [PATH]: serializeJson([{ id: 'natur', label: 'Natur (neu)' }, KUNST]) } },
      otherHeads: ['head1'],
    });
    const c = await render(<SiteEditor site={makeSite()} client={client} onBack={() => {}} />);
    await openEntry(c, 'Natur');
    await type(c.querySelector('#field-label'), 'Natur und Technik');
    await click(button(c, 'Speichern'));

    const dlg = c.querySelector('[role="dialog"]');
    expect(dlg).not.toBeNull();
    expect(dlg.textContent).toContain('„Natur und Technik“ in Fachbereiche wurde inzwischen von jemand anderem geändert.');
    expect(dlg.textContent).toContain('Konflikt 1 von 1');
    expect(dlg.textContent).toContain('Name: Natur (neu)');
    expect(commits(client)).toHaveLength(1);
    await click(button(c, 'Meine Version übernehmen'));

    expect(c.querySelector('[role="dialog"]')).toBeNull();
    const cs = commits(client);
    expect(cs).toHaveLength(2);
    expect(cs[1][4]).toBe('head1');
    expect(lastSaved(client)).toEqual([{ id: 'natur', label: 'Natur und Technik' }, KUNST]);
    expect(c.textContent).toContain('Gespeichert.');
  });

  it('derselbe Eintrag: "Die andere Version" uebernimmt deren Fassung ohne eigene Aenderung', async () => {
    const client = repoClient({
      contents: { head1: { [PATH]: serializeJson([{ id: 'natur', label: 'Natur (neu)' }, KUNST]) } },
      otherHeads: ['head1'],
    });
    const c = await render(<SiteEditor site={makeSite()} client={client} onBack={() => {}} />);
    await openEntry(c, 'Natur');
    await type(c.querySelector('#field-label'), 'Natur und Technik');
    await click(button(c, 'Speichern'));
    await click(button(c, 'Die andere Version übernehmen'));
    // Nichts mehr zu speichern: es bleibt bei einem (gescheiterten) Versuch
    expect(commits(client)).toHaveLength(1);
    expect(c.textContent).toContain('Alle Änderungen gespeichert.');
    expect(c.querySelector('#field-label').value).toBe('Natur (neu)');
  });

  it('Abbrechen: nichts gespeichert, Arbeitsstand und Entwurf bleiben (Pruefung vor dem Speichern)', async () => {
    const client = repoClient({
      head: 'head1', // jemand hat nach dem Oeffnen gespeichert
      contents: { head1: { [PATH]: serializeJson([{ id: 'natur', label: 'Natur (neu)' }, KUNST]) } },
      commitsFail: true,
    });
    const c = await render(<SiteEditor site={makeSite()} client={client} onBack={() => {}} />);
    await openEntry(c, 'Natur');
    await type(c.querySelector('#field-label'), 'Natur und Technik');
    await click(button(c, 'Speichern'));
    expect(c.textContent).toContain('Diese Seite wurde seit dem Öffnen von jemand anderem geändert.');
    expect(c.querySelector('[role="dialog"]')).not.toBeNull();
    await click(button(c, 'Abbrechen'));

    expect(c.querySelector('[role="dialog"]')).toBeNull();
    expect(commits(client)).toHaveLength(0);
    expect(client.calls.some((x) => x[0] === 'updateRef')).toBe(false);
    expect(c.textContent).toContain('Speichern abgebrochen. Ihre Änderungen sind weiterhin vorhanden.');
    expect(c.textContent).toContain('Ungespeicherte Änderungen');
    expect(c.querySelector('#field-label').value).toBe('Natur und Technik');
    const draft = loadDraft('o/r');
    expect(draft.baseSha).toBe('head0');
    expect(draft.data.categories[0].label).toBe('Natur und Technik');
  });

  it('Entwurf auf aelterer Basis: Basis ist der Stand des Entwurfs, Hinweis beim Oeffnen', async () => {
    localStorage.setItem('cms.draft.o/r', JSON.stringify({
      savedAt: '2026-11-27T10:00:00.000Z', baseSha: 'old0',
      data: { categories: [{ id: 'natur', label: 'Natur und Technik' }] }, pages: {}, removedFiles: [], newImages: [],
    }));
    const client = repoClient({
      contents: {
        old0: { [PATH]: serializeJson([NATUR]) },
        head0: { [PATH]: serializeJson([NATUR, KUNST]) },
      },
    });
    const c = await render(<SiteEditor site={makeSite([NATUR, KUNST], 'head0')} client={client} onBack={() => {}} />);
    await click(button(c, 'Wiederherstellen'));
    expect(c.textContent).toContain('Diese Seite wurde seit dem Öffnen von Anna Muster geändert.');
    await click(button(c, 'Speichern'));

    expect(client.calls.some((x) => x[0] === 'getFileText' && x[2] === PATH && x[3] === 'old0')).toBe(true);
    expect(c.querySelector('[role="dialog"]')).toBeNull();
    const cs = commits(client);
    expect(cs).toHaveLength(1);
    expect(cs[0][4]).toBe('head0');
    // "Kunst" kam bei den anderen dazu und bleibt erhalten
    expect(lastSaved(client)).toEqual([{ id: 'natur', label: 'Natur und Technik' }, KUNST]);
    expect(c.textContent).toContain('Gespeichert.');
  });

  it('laufend neue Aenderungen: nach 3 Versuchen aufhoeren, Entwurf bleibt', async () => {
    const client = repoClient({
      contents: { default: { [PATH]: serializeJson([NATUR, KUNST]) } },
      otherHeads: ['h1', 'h2', 'h3', 'h4'],
    });
    const c = await render(<SiteEditor site={makeSite()} client={client} onBack={() => {}} />);
    await openEntry(c, 'Natur');
    await type(c.querySelector('#field-label'), 'Natur und Technik');
    await click(button(c, 'Speichern'));
    expect(client.calls.filter((x) => x[0] === 'updateRef')).toHaveLength(3);
    expect(c.querySelector('[role="alert"]').textContent)
      .toBe('Speichern ist gerade nicht möglich, weil laufend andere Änderungen eintreffen. Bitte in einer Minute erneut versuchen.');
    expect(c.textContent).toContain('Ungespeicherte Änderungen');
    expect(loadDraft('o/r').data.categories[0].label).toBe('Natur und Technik');
  });
});
