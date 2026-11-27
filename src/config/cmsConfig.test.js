import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseCmsConfig } from './cmsConfig.js';

const minimal = () => ({
  name: 'Test',
  export: { shell: 'build', zipName: 'test' },
  contentRoot: 'content',
  collections: [
    {
      id: 'things',
      label: 'Dinge',
      file: 'things.json',
      titleField: 'label',
      fields: [{ name: 'label', type: 'text', label: 'Name', required: true }],
    },
  ],
});

describe('parseCmsConfig', () => {
  it('normalisiert eine gueltige Minimal-Config mit Defaults', () => {
    const c = parseCmsConfig(minimal());
    expect(c.name).toBe('Test');
    expect(c.pages).toEqual([]);
    expect(c.collections[0].key).toBe('id');
    expect(c.collections[0].onDelete).toEqual([]);
    expect(c.collections[0].sortBy).toBeUndefined();
    expect(c.collections[0].fields[0].name).toBe('label');
  });

  it('wirft bei fehlendem name', () => {
    const j = minimal();
    delete j.name;
    expect(() => parseCmsConfig(j)).toThrow(/name/);
  });

  it('wirft bei unbekanntem Feld-Typ und nennt das Feld', () => {
    const j = minimal();
    j.collections[0].fields.push({ name: 'foo', type: 'magie', label: 'Foo' });
    expect(() => parseCmsConfig(j)).toThrow(/foo.*magie|magie.*foo/);
  });

  it('wirft bei reference ohne to', () => {
    const j = minimal();
    j.collections[0].fields.push({ name: 'ref', type: 'reference', label: 'R' });
    expect(() => parseCmsConfig(j)).toThrow(/ref.*to|to.*ref/);
  });

  it('wirft wenn to auf unbekannte Sammlung verweist', () => {
    const j = minimal();
    j.collections[0].fields.push({ name: 'ref', type: 'reference-multi', label: 'R', to: 'nirgends' });
    expect(() => parseCmsConfig(j)).toThrow(/nirgends/);
  });

  it('wirft bei doppelter Sammlungs-ID', () => {
    const j = minimal();
    j.collections.push({ ...j.collections[0] });
    expect(() => parseCmsConfig(j)).toThrow(/things.*doppelt|doppelt.*things/);
  });

  it('wirft wenn onDelete.referencedBy auf unbekannte Sammlung zeigt', () => {
    const j = minimal();
    j.collections[0].onDelete = [{ referencedBy: 'nope.x', mode: 'remove' }];
    expect(() => parseCmsConfig(j)).toThrow(/nope/);
  });

  it('wirft wenn onDelete.referencedBy auf unbekanntes Feld zeigt', () => {
    const j = minimal();
    j.collections[0].onDelete = [{ referencedBy: 'things.fehlt', mode: 'remove' }];
    expect(() => parseCmsConfig(j)).toThrow(/fehlt/);
  });
});

const carousel = () => ({
  name: 'carousel', label: 'Karussell', file: 'carousel.json',
  fields: [
    { name: 'interval_seconds', type: 'number', label: 'Wechsel', required: true, min: 5, max: 20, step: 1, default: 7 },
    { name: 'fill', type: 'boolean', label: 'Auffuellen', default: true },
  ],
});
const withFeatured = () => {
  const j = minimal();
  j.collections[0].fields.push({ name: 'featured', type: 'boolean', label: 'Angepinnt' });
  return j;
};
const selection = (extra = {}) => ({
  type: 'selection', name: 'fokus', label: 'Im Fokus', collection: 'things', field: 'featured', ...extra,
});

describe('parseCmsConfig: settings', () => {
  it('ohne settings/views: leere Listen', () => {
    const c = parseCmsConfig(minimal());
    expect(c.settings).toEqual([]);
    expect(c.views).toEqual([]);
  });

  it('gueltige settings werden uebernommen', () => {
    const j = minimal();
    j.settings = [carousel()];
    const c = parseCmsConfig(j);
    expect(c.settings[0].name).toBe('carousel');
    expect(c.settings[0].label).toBe('Karussell');
    expect(c.settings[0].fields.map((f) => f.name)).toEqual(['interval_seconds', 'fill']);
  });

  it('wirft bei fehlendem file, unbekanntem Feld-Typ, doppeltem Namen', () => {
    const a = minimal();
    a.settings = [{ ...carousel(), file: undefined }];
    expect(() => parseCmsConfig(a)).toThrow(/carousel.*file/);
    const b = minimal();
    b.settings = [{ ...carousel(), fields: [{ name: 'x', type: 'magie' }] }];
    expect(() => parseCmsConfig(b)).toThrow(/magie/);
    const d = minimal();
    d.settings = [carousel(), carousel()];
    expect(() => parseCmsConfig(d)).toThrow(/carousel.*doppelt|doppelt.*carousel/);
  });

  it('wirft bei .. oder absolutem Pfad in file', () => {
    const a = minimal();
    a.settings = [{ ...carousel(), file: '../geheim.json' }];
    expect(() => parseCmsConfig(a)).toThrow(/\.\./);
    const b = minimal();
    b.settings = [{ ...carousel(), file: '/carousel.json' }];
    expect(() => parseCmsConfig(b)).toThrow(/relativ/);
  });

  it('wirft bei Verweisfeld in settings', () => {
    const j = minimal();
    j.settings = [{ ...carousel(), fields: [{ name: 'r', type: 'reference', to: 'things' }] }];
    expect(() => parseCmsConfig(j)).toThrow(/r/);
  });
});

describe('parseCmsConfig: views', () => {
  it('gueltige Auswahl-Ansicht mit settings', () => {
    const j = withFeatured();
    j.settings = [carousel()];
    j.views = [selection({ settings: 'carousel', hint: 'Hilfe' })];
    const c = parseCmsConfig(j);
    expect(c.views[0]).toMatchObject({ type: 'selection', name: 'fokus', label: 'Im Fokus', collection: 'things', field: 'featured', settings: 'carousel', hint: 'Hilfe' });
  });

  it('wirft bei unbekannter Sammlung', () => {
    const j = withFeatured();
    j.views = [selection({ collection: 'nirgends' })];
    expect(() => parseCmsConfig(j)).toThrow(/nirgends/);
  });

  it('wirft bei unbekanntem oder nicht-booleschem Feld', () => {
    const a = withFeatured();
    a.views = [selection({ field: 'fehlt' })];
    expect(() => parseCmsConfig(a)).toThrow(/fehlt/);
    const b = withFeatured();
    b.views = [selection({ field: 'label' })];
    expect(() => parseCmsConfig(b)).toThrow(/label.*boolean|boolean.*label/);
  });

  it('wirft bei unbekanntem settings-Verweis', () => {
    const j = withFeatured();
    j.views = [selection({ settings: 'weg' })];
    expect(() => parseCmsConfig(j)).toThrow(/weg/);
  });

  it('wirft bei unbekanntem Typ und doppeltem Namen', () => {
    const a = withFeatured();
    a.views = [selection({ type: 'galerie' })];
    expect(() => parseCmsConfig(a)).toThrow(/galerie/);
    const b = withFeatured();
    b.views = [selection(), selection()];
    expect(() => parseCmsConfig(b)).toThrow(/fokus.*doppelt|doppelt.*fokus/);
  });
});

// Hinweis: Dieser Test liest die Schwester-Repo-Datei ../oer-dashboard/cms.json
// (relativ zum CMS-Repo-Root). Er haengt damit vom Nachbarordner ab und wird
// uebersprungen, wenn die Datei fehlt (z. B. in GitHub-CI).
const realPath = path.resolve(process.cwd(), '../oer-dashboard/cms.json');
describe('echte oer-dashboard/cms.json', () => {
  it.skipIf(!fs.existsSync(realPath))('parst fehlerfrei', () => {
    const c = parseCmsConfig(JSON.parse(fs.readFileSync(realPath, 'utf8')));
    expect(c.collections).toHaveLength(5);
    expect(c.collections.find((x) => x.id === 'resources').titleField).toBe('title');
    expect(c.pages).toHaveLength(4);
    expect(c.settings.map((x) => x.name)).toEqual(['carousel']);
    expect(c.views).toEqual([expect.objectContaining({ type: 'selection', collection: 'resources', field: 'featured', settings: 'carousel' })]);
  });
});
