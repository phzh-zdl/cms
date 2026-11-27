import { describe, it, expect } from 'vitest';
import { usagesOf } from './references.js';
import { planDelete } from './deleteRules.js';

const collections = [
  { id: 'categories', label: 'Fachbereiche', key: 'id', titleField: 'label', fields: [{ name: 'id', type: 'slug' }], onDelete: [{ referencedBy: 'resources.category_id', mode: 'reassign' }] },
  { id: 'formats', label: 'Formate', key: 'id', titleField: 'label', fields: [{ name: 'id', type: 'slug' }], onDelete: [{ referencedBy: 'resources.format_ids', mode: 'remove' }] },
  {
    id: 'resources', label: 'Ressourcen', key: 'id', titleField: 'title', onDelete: [],
    fields: [
      { name: 'category_id', type: 'reference', to: 'categories' },
      { name: 'format_ids', type: 'reference-multi', to: 'formats' },
    ],
  },
  {
    id: 'events', label: 'Anlässe', key: 'id', titleField: 'name', onDelete: [],
    fields: [{ name: 'formats', type: 'reference-multi', to: 'formats' }],
  },
];
const config = { contentRoot: 'c', collections };
const data = {
  categories: [{ id: 'natur' }, { id: 'kunst' }],
  formats: [{ id: 'pdf' }, { id: 'video' }],
  resources: [
    { id: 'r1', title: 'A', category_id: 'natur', format_ids: ['pdf', 'video'] },
    { id: 'r2', title: 'B', category_id: 'kunst', format_ids: ['pdf'] },
    { id: 'r3', title: 'C', category_id: 'natur', format_ids: [] },
  ],
  events: [{ id: 'e1', name: 'Tag', formats: ['pdf'] }],
};

describe('usagesOf', () => {
  it('reference: verweisende Eintraege je Sammlung, in Sammlungsreihenfolge', () => {
    const u = usagesOf(data, collections, 'categories', 'natur');
    expect(u).toHaveLength(1);
    expect(u[0].collection.id).toBe('resources');
    expect(u[0].rows.map((r) => r.id)).toEqual(['r1', 'r3']);
  });
  it('reference-multi und mehrere verweisende Sammlungen', () => {
    const u = usagesOf(data, collections, 'formats', 'pdf');
    expect(u.map((x) => [x.collection.id, x.rows.map((r) => r.id)])).toEqual([['resources', ['r1', 'r2']], ['events', ['e1']]]);
  });
  it('Sammlung ohne Verweise auf sich: leer; keine Verwendung: rows leer', () => {
    expect(usagesOf(data, collections, 'resources', 'r1')).toEqual([]);
    expect(usagesOf(data, collections, 'categories', 'nix')[0].rows).toEqual([]);
  });
  it('dieselben Zahlen wie planDelete', () => {
    for (const [col, id] of [['categories', 'natur'], ['categories', 'kunst'], ['formats', 'video']]) {
      const n = usagesOf(data, collections, col, id).find((x) => x.collection.id === 'resources').rows.length;
      expect(planDelete(data, config, col, id).affected).toHaveLength(n);
    }
  });
});
