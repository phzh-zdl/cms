// Gemeinsame Testhilfen fuer Einstellungen, Auswahl-Ansicht und "Verwendet von".
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { parseCmsConfig } from '../../config/cmsConfig.js';
import { serializeJson } from '../../save/serialize.js';
import { ConflictError } from '../../github/client.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

export const CAROUSEL = {
  name: 'carousel', label: 'Karussell', file: 'carousel.json',
  fields: [
    { name: 'interval_seconds', type: 'number', label: 'Wechsel alle … Sekunden', required: true, min: 5, max: 20, step: 1, default: 7 },
    { name: 'count', type: 'number', label: 'Anzahl Karten', required: true, min: 3, max: 24, step: 1, default: 9 },
    { name: 'fill', type: 'boolean', label: 'Mit weiteren Ressourcen auffüllen (täglich wechselnd)', default: true },
  ],
};
export const VIEW = {
  type: 'selection', name: 'im-fokus', label: 'Karussell (Im Fokus)',
  collection: 'resources', field: 'featured', settings: 'carousel',
  hint: 'Ausgewählte Ressourcen erscheinen zuerst, in der Reihenfolge des Katalogs.',
  addLabel: 'Ressource hinzufügen',
  clearConfirm: 'Alle {n} Ressourcen abwählen? Sie bleiben im Katalog, erscheinen aber nicht mehr fest im Karussell.',
};

export const RESOURCES = [
  { id: 'r1', title: 'Alpha', category_id: 'natur', level_ids: ['sek'], featured: true },
  { id: 'r2', title: 'Beta', category_id: 'kunst', level_ids: [], featured: false },
  { id: 'r3', title: 'Gamma', category_id: 'natur', level_ids: [], featured: true },
  { id: 'r4', title: 'Delta', category_id: 'kunst', level_ids: [], featured: false },
];
export const CATEGORIES = [{ id: 'natur', label: 'Natur' }, { id: 'kunst', label: 'Kunst' }];
export const LEVELS = [{ id: 'sek', label: 'Sekundarstufe' }, { id: 'prim', label: 'Primarstufe' }];
export const EVENTS = [{ id: 'e1', name: 'Tagung', level_ids: ['sek'] }];

const slugCollection = (id, label, file, extra = {}) => ({
  id, label, file, titleField: 'label', idField: { type: 'slug' },
  fields: [{ name: 'id', type: 'slug', label: 'ID', required: true, immutable: true }, { name: 'label', type: 'text', label: 'Name', required: true }],
  ...extra,
});

export function makeConfig({ settings = [CAROUSEL], views = [VIEW], events = false } = {}) {
  return parseCmsConfig({
    name: 'Test', export: { shell: 'build', zipName: 't' }, contentRoot: 'content',
    collections: [
      {
        id: 'resources', label: 'Ressourcen', file: 'resources.json', titleField: 'title', idField: { type: 'uuid' },
        fields: [
          { name: 'title', type: 'text', label: 'Titel', required: true },
          { name: 'category_id', type: 'reference', to: 'categories', label: 'Fachbereich' },
          { name: 'level_ids', type: 'reference-multi', to: 'levels', label: 'Zielstufen' },
          { name: 'featured', type: 'boolean', label: 'Im Karussell anpinnen' },
        ],
      },
      slugCollection('categories', 'Fachbereiche', 'categories.json', { onDelete: [{ referencedBy: 'resources.category_id', mode: 'reassign' }] }),
      slugCollection('levels', 'Zielstufen', 'levels.json'),
      ...(events ? [{
        id: 'events', label: 'Anlässe', file: 'events.json', titleField: 'name', idField: { type: 'uuid' },
        fields: [{ name: 'name', type: 'text', label: 'Name' }, { name: 'level_ids', type: 'reference-multi', to: 'levels', label: 'Zielstufen' }],
      }] : []),
    ],
    pages: [],
    settings,
    views,
  });
}

export function contentFiles({ resources = RESOURCES, carousel, events = false } = {}) {
  const files = {
    'content/resources.json': serializeJson(resources),
    'content/categories.json': serializeJson(CATEGORIES),
    'content/levels.json': serializeJson(LEVELS),
  };
  if (events) files['content/events.json'] = serializeJson(EVENTS);
  if (carousel !== undefined) files['content/carousel.json'] = serializeJson(carousel);
  return files;
}

export function makeSite({ carousel, events = false, ...cfg } = {}) {
  const config = makeConfig({ ...cfg, events });
  const data = { resources: RESOURCES, categories: CATEGORIES, levels: LEVELS };
  if (events) data.events = EVENTS;
  return {
    repo: 'o/r', headSha: 'head0', config,
    original: contentFiles({ carousel, events }),
    data, pages: {}, settings: carousel === undefined ? {} : { carousel },
  };
}

// Kleines Repo im Speicher (wie SiteEditor.conflict.test.jsx). contents: { [ref]: { [Pfad]: Text } }.
export function repoClient({ contents = {}, otherHeads = [] } = {}) {
  const state = { head: 'head0', calls: [], blobs: [], trees: [], commitNo: 0 };
  const call = (name, ...a) => state.calls.push([name, ...a]);
  return {
    state,
    calls: state.calls,
    getRef: async (...a) => { call('getRef', ...a); return state.head; },
    getFileText: async (repo, path, ref) => {
      call('getFileText', repo, path, ref);
      const text = contents[ref]?.[path];
      return text === undefined ? null : { text, sha: 'x' };
    },
    listCommits: async () => [{ sha: state.head, message: 'm', author: { name: 'Anna Muster' }, date: null }],
    getCommit: async (...a) => { call('getCommit', ...a); return { treeSha: `tree-${a[1]}` }; },
    getTree: async () => [],
    createBlob: async (repo, bytes) => { state.blobs.push(new TextDecoder().decode(bytes)); return `blob${state.blobs.length}`; },
    createTree: async (repo, baseTree, entries) => { state.trees.push(entries); return 'treeN'; },
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

// Gespeicherte Dateien der letzten Speicherung: { Pfad: Text }
export function lastWrite(client) {
  const entries = client.state.trees.at(-1) ?? [];
  const out = {};
  entries.forEach((e) => { out[e.path] = client.state.blobs[Number(e.sha.slice(4)) - 1]; });
  return out;
}

let container;
let root;
export async function render(ui) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(ui));
  return container;
}
export function cleanup() {
  act(() => root?.unmount());
  container?.remove();
  container = root = null;
}
export async function type(el, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
export async function select(el, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
export const button = (c, text) => [...c.querySelectorAll('button')].find((b) => b.textContent === text);
export const named = (c, name) => [...c.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === name);
export const click = async (el) => act(async () => el.click());
export const nav = (c, label) => [...c.querySelectorAll('nav button')].find((b) => b.textContent === label);
export const openEntry = async (c, title) =>
  click([...c.querySelectorAll('.entry-list button')].find((b) => b.textContent.includes(title)));
