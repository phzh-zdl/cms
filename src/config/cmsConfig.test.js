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
  });
});
