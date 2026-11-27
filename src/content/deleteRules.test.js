import { describe, it, expect } from 'vitest';
import { planDelete, applyDelete } from './deleteRules.js';

const config = {
  contentRoot: 'public/content',
  collections: [
    { id: 'categories', key: 'id', fields: [{ name: 'id', type: 'slug' }], onDelete: [{ referencedBy: 'resources.category_id', mode: 'reassign' }] },
    { id: 'formats', key: 'id', fields: [{ name: 'id', type: 'slug' }], onDelete: [{ referencedBy: 'resources.format_ids', mode: 'remove' }] },
    { id: 'licenses', key: 'id', fields: [{ name: 'id', type: 'slug' }], onDelete: [{ referencedBy: 'resources.license_id', mode: 'nullify' }] },
    { id: 'odd', key: 'id', fields: [], onDelete: [{ referencedBy: 'resources.license_id', mode: 'explode' }] },
    {
      id: 'resources', key: 'id', onDelete: [],
      fields: [
        { name: 'id', type: 'uuid' },
        { name: 'category_id', type: 'reference', to: 'categories' },
        { name: 'format_ids', type: 'reference-multi', to: 'formats' },
        { name: 'license_id', type: 'reference', to: 'licenses' },
        { name: 'image', type: 'image', dir: 'images' },
      ],
    },
  ],
};
const make = () => ({
  categories: [{ id: 'natur' }, { id: 'kunst' }, { id: 'leer' }],
  formats: [{ id: 'pdf' }, { id: 'video' }],
  licenses: [{ id: 'cc-by' }],
  odd: [{ id: 'x' }],
  resources: [
    { id: 'r1', category_id: 'natur', format_ids: ['pdf', 'video'], license_id: 'cc-by', image: 'a.webp' },
    { id: 'r2', category_id: 'natur', format_ids: ['pdf'], license_id: null, image: '' },
    { id: 'r3', category_id: 'natur', format_ids: [], license_id: 'cc-by', image: 'c.webp' },
    { id: 'r4', category_id: 'kunst', format_ids: ['video'], license_id: null },
  ],
});

describe('planDelete', () => {
  it('Fachbereich in Gebrauch: reassign mit 3 betroffenen Ressourcen', () => {
    expect(planDelete(make(), config, 'categories', 'natur')).toEqual({ mode: 'reassign', affected: ['r1', 'r2', 'r3'] });
  });
  it('unbenutzter Fachbereich: free', () => {
    expect(planDelete(make(), config, 'categories', 'leer')).toEqual({ mode: 'free', affected: [] });
  });
  it('Format: remove; Lizenz: nullify', () => {
    expect(planDelete(make(), config, 'formats', 'pdf')).toEqual({ mode: 'remove', affected: ['r1', 'r2'] });
    expect(planDelete(make(), config, 'licenses', 'cc-by')).toEqual({ mode: 'nullify', affected: ['r1', 'r3'] });
  });
  it('Ressource ohne Regeln: free', () => {
    expect(planDelete(make(), config, 'resources', 'r1').mode).toBe('free');
  });
  it('unbekannter Modus wirft', () => {
    expect(() => planDelete(make(), config, 'odd', 'x')).toThrow('Unbekannte Löschregel „explode“ in odd.');
  });
  it('strengste Regel gewinnt: reassign vor nullify', () => {
    const cfg = structuredClone(config);
    cfg.collections[0].onDelete.push({ referencedBy: 'resources.license_id', mode: 'nullify' });
    const d = make();
    d.resources[0].license_id = 'natur';
    expect(planDelete(d, cfg, 'categories', 'natur').mode).toBe('reassign');
  });
});

describe('applyDelete', () => {
  it('reassign hängt alle um und entfernt den Eintrag', () => {
    const { data, removedFiles } = applyDelete(make(), config, 'categories', 'natur', { reassignTo: 'kunst' });
    expect(data.categories.map((c) => c.id)).toEqual(['kunst', 'leer']);
    expect(data.resources.map((r) => r.category_id)).toEqual(['kunst', 'kunst', 'kunst', 'kunst']);
    expect(removedFiles).toEqual([]);
  });
  it('reassign ohne gültiges Ziel wirft', () => {
    expect(() => applyDelete(make(), config, 'categories', 'natur')).toThrow(/Ziel/);
    expect(() => applyDelete(make(), config, 'categories', 'natur', { reassignTo: 'natur' })).toThrow(/Ziel/);
    expect(() => applyDelete(make(), config, 'categories', 'natur', { reassignTo: 'gibtsnicht' })).toThrow(/Ziel/);
  });
  it('reassign wird nicht verlangt, wenn nichts betroffen ist', () => {
    const { data } = applyDelete(make(), config, 'categories', 'leer');
    expect(data.categories.map((c) => c.id)).toEqual(['natur', 'kunst']);
  });
  it('remove nimmt die ID aus allen format_ids', () => {
    const { data } = applyDelete(make(), config, 'formats', 'pdf');
    expect(data.resources.map((r) => r.format_ids)).toEqual([['video'], [], [], ['video']]);
    expect(data.formats.map((f) => f.id)).toEqual(['video']);
  });
  it('nullify setzt license_id auf null', () => {
    const { data } = applyDelete(make(), config, 'licenses', 'cc-by');
    expect(data.resources.map((r) => r.license_id)).toEqual([null, null, null, null]);
    expect(data.licenses).toEqual([]);
  });
  it('Ressource löschen: free, Bild wird gemeldet; ohne Bild nichts', () => {
    const a = applyDelete(make(), config, 'resources', 'r1');
    expect(a.data.resources.map((r) => r.id)).toEqual(['r2', 'r3', 'r4']);
    expect(a.removedFiles).toEqual(['public/content/images/a.webp']);
    expect(applyDelete(make(), config, 'resources', 'r2').removedFiles).toEqual([]);
  });
  it('neuer, ungespeicherter Eintrag löscht sich als free', () => {
    const d = make();
    d.resources.push({ id: 'neu', category_id: null, format_ids: [], license_id: null, image: '' });
    expect(planDelete(d, config, 'resources', 'neu').mode).toBe('free');
    expect(applyDelete(d, config, 'resources', 'neu').data.resources).toHaveLength(4);
  });
  it('verändert die Eingabe nicht', () => {
    const d = make();
    const before = structuredClone(d);
    applyDelete(d, config, 'categories', 'natur', { reassignTo: 'kunst' });
    applyDelete(d, config, 'formats', 'pdf');
    applyDelete(d, config, 'licenses', 'cc-by');
    expect(d).toEqual(before);
  });
});
