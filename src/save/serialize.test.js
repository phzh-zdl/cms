import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { serializeJson, collectChanges } from './serialize.js';

// Echte Katalog-Datei aus Teil 1 (Nachbar-Repo); fehlt sie, wird der Test uebersprungen.
const catalogFile = resolve(process.cwd(), '../oer-dashboard/public/content/categories.json');

const config = {
  contentRoot: 'public/content',
  collections: [
    { id: 'categories', label: 'Fachbereiche', file: 'categories.json' },
    { id: 'resources', label: 'Ressourcen', file: 'resources.json' },
  ],
  pages: [{ id: 'impressum', label: 'Impressum', file: 'pages/impressum.json' }],
};
const data = {
  categories: [{ id: 'natur', label: 'Natur' }],
  resources: [{ id: 'r1', title: 'A' }],
};
const pages = { impressum: { title: 'Impressum', body: 'x' } };
const site = {
  config,
  original: {
    'public/content/categories.json': serializeJson(data.categories),
    'public/content/resources.json': serializeJson(data.resources),
    'public/content/pages/impressum.json': serializeJson(pages.impressum),
  },
};

describe('serializeJson', () => {
  it.skipIf(!existsSync(catalogFile))('erzeugt exakt das Format der Katalog-Datei', () => {
    const text = readFileSync(catalogFile, 'utf8').replace(/\r\n/g, '\n');
    expect(serializeJson(JSON.parse(text))).toBe(text);
  });
  it('2 Leerzeichen, Feldreihenfolge bleibt, Zeilenumbruch am Ende', () => {
    expect(serializeJson([{ b: 1, a: 'ä' }])).toBe('[\n  {\n    "b": 1,\n    "a": "ä"\n  }\n]\n');
  });
});

describe('collectChanges', () => {
  it('ignoriert unveraenderte Dateien', () => {
    expect(collectChanges(site, data, pages)).toEqual([]);
  });
  it('liefert nur die geaenderte Datei mit neuem Text', () => {
    const next = { ...data, resources: [{ id: 'r1', title: 'B' }] };
    expect(collectChanges(site, next, pages)).toEqual([
      { path: 'public/content/resources.json', text: serializeJson(next.resources) },
    ]);
  });
  it('Original mit CRLF gilt als gleich', () => {
    const crlf = { ...site, original: { ...site.original, 'public/content/categories.json': serializeJson(data.categories).replace(/\n/g, '\r\n') } };
    expect(collectChanges(crlf, data, pages)).toEqual([]);
  });
  it('reine Formatunterschiede im Original gelten als gleich', () => {
    const odd = { ...site, original: { ...site.original, 'public/content/categories.json': JSON.stringify(data.categories) } };
    expect(collectChanges(odd, data, pages)).toEqual([]);
  });
  it('geaenderte Textseiten gehoeren dazu', () => {
    const p = { impressum: { title: 'Impressum', body: 'neu' } };
    expect(collectChanges(site, data, p)).toEqual([
      { path: 'public/content/pages/impressum.json', text: serializeJson(p.impressum) },
    ]);
  });
  it('neue Bilder und zu loeschende Dateien', () => {
    const bytes = new Uint8Array([1, 2]);
    expect(collectChanges(site, data, pages, [{ path: 'public/content/images/a.png', bytes }], ['public/content/images/old.png'])).toEqual([
      { path: 'public/content/images/a.png', bytes },
      { path: 'public/content/images/old.png', delete: true },
    ]);
  });
  it('eine Datei, die neu geschrieben wird, wird nicht geloescht', () => {
    const bytes = new Uint8Array([1]);
    expect(collectChanges(site, data, pages, [{ path: 'img/a.png', bytes }], ['img/a.png'])).toEqual([
      { path: 'img/a.png', bytes },
    ]);
  });
});

describe('collectChanges: noch verwendete Bilder', () => {
  const cfg = {
    contentRoot: 'public/content',
    collections: [{ id: 'resources', label: 'Ressourcen', file: 'resources.json',
      fields: [{ name: 'title', type: 'text' }, { name: 'image', type: 'image', dir: 'images' }] }],
    pages: [],
  };
  it('loescht keine Datei, die ein Eintrag noch verwendet (geteilter Dateiname)', () => {
    const rows = [{ id: 'r2', title: 'B', image: 'same.webp' }];
    const st = { config: cfg, original: { 'public/content/resources.json': serializeJson([{ id: 'r1', title: 'A', image: 'same.webp' }, ...rows]) } };
    const out = collectChanges(st, { resources: rows }, {}, [], ['public/content/images/same.webp', 'public/content/images/weg.webp']);
    expect(out.filter((c) => c.delete)).toEqual([{ path: 'public/content/images/weg.webp', delete: true }]);
  });
});

describe('collectChanges: Einstellungen', () => {
  const cfg = { ...config, settings: [{ name: 'carousel', file: 'carousel.json', fields: [] }] };
  const st = { config: cfg, original: site.original };
  it('unberuehrt (undefined): keine Aenderung; gesetzt: neue Datei', () => {
    expect(collectChanges(st, data, pages, [], [], {})).toEqual([]);
    const value = { interval_seconds: 7, count: 9, fill: false };
    expect(collectChanges(st, data, pages, [], [], { carousel: value }))
      .toEqual([{ path: 'public/content/carousel.json', text: serializeJson(value) }]);
  });
});
