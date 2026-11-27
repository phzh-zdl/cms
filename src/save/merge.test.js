import { describe, it, expect } from 'vitest';
import { mergeCollections, mergePage, sameValue, mergeSite, applyChoices } from './merge.js';

const a = { id: 'a', title: 'A' };
const b = { id: 'b', title: 'B' };
const c = { id: 'c', title: 'C' };

describe('sameValue', () => {
  it('Schluesselreihenfolge spielt keine Rolle', () => {
    expect(sameValue({ id: 'a', title: 'A', x: { p: 1, q: 2 } }, { x: { q: 2, p: 1 }, title: 'A', id: 'a' })).toBe(true);
    expect(sameValue({ id: 'a', list: [1, 2] }, { id: 'a', list: [2, 1] })).toBe(false);
    expect(sameValue(undefined, undefined)).toBe(true);
    expect(sameValue(a, undefined)).toBe(false);
  });
});

describe('mergeCollections', () => {
  it('verschiedene Eintraege geaendert: beide Aenderungen, keine Konflikte', () => {
    const mine = [{ ...a, title: 'A2' }, b, c];
    const theirs = [a, { ...b, title: 'B2' }, c];
    const r = mergeCollections([a, b, c], mine, theirs);
    expect(r.conflicts).toEqual([]);
    expect(r.merged).toEqual([{ id: 'a', title: 'A2' }, { id: 'b', title: 'B2' }, c]);
  });

  it('derselbe Eintrag unterschiedlich geaendert: 1 Konflikt', () => {
    const r = mergeCollections([a, b], [{ ...a, title: 'Mein A' }, b], [{ ...a, title: 'Ihr A' }, b]);
    expect(r.conflicts).toEqual([{ id: 'a', mine: { id: 'a', title: 'Mein A' }, theirs: { id: 'a', title: 'Ihr A' } }]);
  });

  it('ich geloescht, andere geaendert: Konflikt mit mine null', () => {
    const r = mergeCollections([a, b], [b], [{ ...a, title: 'Ihr A' }, b]);
    expect(r.conflicts).toEqual([{ id: 'a', mine: null, theirs: { id: 'a', title: 'Ihr A' } }]);
  });

  it('andere geloescht, ich geaendert: Konflikt mit theirs null', () => {
    const r = mergeCollections([a, b], [{ ...a, title: 'Mein A' }, b], [b]);
    expect(r.conflicts).toEqual([{ id: 'a', mine: { id: 'a', title: 'Mein A' }, theirs: null }]);
  });

  it('beide gleich geaendert (andere Schluesselreihenfolge): kein Konflikt', () => {
    const r = mergeCollections([a], [{ id: 'a', title: 'Neu' }], [{ title: 'Neu', id: 'a' }]);
    expect(r.conflicts).toEqual([]);
    expect(r.merged).toHaveLength(1);
    expect(r.merged[0].title).toBe('Neu');
  });

  it('nur andere Schluesselreihenfolge auf meiner Seite: kein Konflikt, Aenderung der anderen gilt', () => {
    const r = mergeCollections([a], [{ title: 'A', id: 'a' }], [{ id: 'a', title: 'Ihr A' }]);
    expect(r.conflicts).toEqual([]);
    expect(r.merged).toEqual([{ id: 'a', title: 'Ihr A' }]);
  });

  it('neue Eintraege beider Seiten bleiben erhalten (eigene angehaengt)', () => {
    const r = mergeCollections([a], [a, { id: 'mein', title: 'M' }], [{ id: 'ihr', title: 'I' }, a]);
    expect(r.conflicts).toEqual([]);
    expect(r.merged.map((e) => e.id)).toEqual(['ihr', 'a', 'mein']);
  });

  it('beide fuegen dieselbe neue Kennung unterschiedlich hinzu: Konflikt', () => {
    const r = mergeCollections([], [{ id: 'x', title: 'Mein X' }], [{ id: 'x', title: 'Ihr X' }]);
    expect(r.conflicts).toEqual([{ id: 'x', mine: { id: 'x', title: 'Mein X' }, theirs: { id: 'x', title: 'Ihr X' } }]);
  });

  it('andere geloescht, ich unveraendert: geloescht', () => {
    const r = mergeCollections([a, b], [a, b], [b]);
    expect(r.conflicts).toEqual([]);
    expect(r.merged).toEqual([b]);
  });

  it('ich geloescht, andere unveraendert: geloescht', () => {
    const r = mergeCollections([a, b], [b], [a, b]);
    expect(r.conflicts).toEqual([]);
    expect(r.merged).toEqual([b]);
  });

  it('Reihenfolge wie bei den anderen', () => {
    const r = mergeCollections([a, b, c], [c, b, a], [b, a, c]);
    expect(r.merged.map((e) => e.id)).toEqual(['b', 'a', 'c']);
  });

  it('eigener Schluessel', () => {
    const r = mergeCollections([{ slug: 's', t: 1 }], [{ slug: 's', t: 2 }], [{ slug: 's', t: 1 }, { slug: 'n', t: 0 }], 'slug');
    expect(r.merged).toEqual([{ slug: 's', t: 2 }, { slug: 'n', t: 0 }]);
  });
});

describe('mergePage', () => {
  const p = { id: 'i', title: 'T', html: '<p>x</p>' };
  it('nur eine Seite geaendert: deren Fassung', () => {
    expect(mergePage(p, { ...p, html: '<p>mein</p>' }, p)).toEqual({ merged: { ...p, html: '<p>mein</p>' } });
    expect(mergePage(p, p, { ...p, html: '<p>ihr</p>' })).toEqual({ merged: { ...p, html: '<p>ihr</p>' } });
  });
  it('beide gleich: kein Konflikt', () => {
    expect(mergePage(p, { ...p, title: 'N' }, { title: 'N', html: p.html, id: 'i' })).toEqual({ merged: { ...p, title: 'N' } });
  });
  it('beide unterschiedlich: Konflikt', () => {
    expect(mergePage(p, { ...p, title: 'M' }, { ...p, title: 'I' }))
      .toEqual({ conflict: { mine: { ...p, title: 'M' }, theirs: { ...p, title: 'I' } } });
  });
});

describe('mergeSite + applyChoices', () => {
  const config = {
    collections: [{ id: 'res', key: 'id', titleField: 'title' }],
    pages: [{ id: 'imp', label: 'Impressum' }],
  };
  const page = { id: 'imp', title: 'Impressum', html: '<p>a</p>' };
  const base = { data: { res: [a, b] }, pages: { imp: page } };

  it('sammelt Konflikte aus Sammlungen und Seiten', () => {
    const mine = { data: { res: [{ ...a, title: 'M' }, b] }, pages: { imp: { ...page, html: '<p>m</p>' } } };
    const theirs = { data: { res: [{ ...a, title: 'I' }, { ...b, title: 'B2' }] }, pages: { imp: { ...page, html: '<p>i</p>' } } };
    const r = mergeSite(config, base, mine, theirs);
    expect(r.conflicts).toEqual([
      { kind: 'collection', collectionId: 'res', id: 'a', mine: { id: 'a', title: 'M' }, theirs: { id: 'a', title: 'I' } },
      { kind: 'page', pageId: 'imp', mine: { ...page, html: '<p>m</p>' }, theirs: { ...page, html: '<p>i</p>' } },
    ]);
    const done = applyChoices(r, ['mine', 'theirs']);
    expect(done.data.res).toEqual([{ id: 'a', title: 'M' }, { id: 'b', title: 'B2' }]);
    expect(done.pages.imp.html).toBe('<p>i</p>');
  });

  it('Wahl einer geloeschten Fassung entfernt den Eintrag, die andere fuegt ihn ein', () => {
    const r1 = mergeSite(config, base, { data: { res: [b] }, pages: base.pages }, { data: { res: [{ ...a, title: 'I' }, b] }, pages: base.pages });
    expect(applyChoices(r1, ['mine']).data.res).toEqual([b]);
    expect(applyChoices(r1, ['theirs']).data.res).toEqual([{ id: 'a', title: 'I' }, b]);
    const r2 = mergeSite(config, base, { data: { res: [{ ...a, title: 'M' }, b] }, pages: base.pages }, { data: { res: [b] }, pages: base.pages });
    expect(applyChoices(r2, ['mine']).data.res).toEqual([b, { id: 'a', title: 'M' }]);
    expect(applyChoices(r2, ['theirs']).data.res).toEqual([b]);
  });
});
