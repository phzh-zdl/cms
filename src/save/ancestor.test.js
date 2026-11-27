import { describe, it, expect } from 'vitest';
import { rebaseState, pruneAncestor } from './ancestor.js';
import { mergeSite } from './merge.js';

const config = { collections: [{ id: 'cat', label: 'Fachbereiche', key: 'id' }], pages: [{ id: 'imp' }] };
const X0 = { id: 'x', l: 'X0' };
const Xme = { id: 'x', l: 'Xme' };
const X2 = { id: 'x', l: 'X2' };
const Y0 = { id: 'y', l: 'Y0' };
const Y1 = { id: 'y', l: 'Y1' };
const Y2 = { id: 'y', l: 'Y2' };
const W = { id: 'w', l: 'W von anderen' };
const P = { id: 'imp', title: 'T', html: '<p>a</p>' };

// Klick auf Speichern mit [X0, Y0]; die anderen hatten Y1 und W gespeichert (merged);
// waehrend des Speicherns habe ich X bearbeitet.
const from = { data: { cat: [X0, Y0] }, pages: { imp: P } };
const merged = { data: { cat: [X0, Y1, W] }, pages: { imp: P } };
const cur = { data: { cat: [Xme, Y0] }, pages: { imp: P } };

const nextSave = (state, theirsCat) => {
  const ancestor = { data: { cat: merged.data.cat, ...state.ancestor?.data }, pages: { ...merged.pages, ...state.ancestor?.pages } };
  return mergeSite(config, ancestor, { data: state.data, pages: state.pages }, { data: { cat: theirsCat }, pages: merged.pages });
};
const labels = (r) => r.data.cat.map((e) => e.l);

describe('rebaseState: Vergleichsbasis pro Eintrag', () => {
  const state = rebaseState(config, from, cur, merged);

  it('Arbeitsstand: meine neuere Aenderung + die der anderen; Basis nur fuer X vom Klick', () => {
    expect(state.data.cat).toEqual([Xme, Y1, W]);
    expect(state.ancestor).toEqual({ data: { cat: [X0, Y1, W] }, pages: {} });
  });

  it('A: andere unveraendert -> kein Konflikt', () => {
    const r = nextSave(state, [X0, Y1, W]);
    expect(r.conflicts).toEqual([]);
    expect(labels(r)).toEqual(['Xme', 'Y1', 'W von anderen']);
  });
  it('B: andere aendern Y erneut -> deren Y2, kein Konflikt', () => {
    const r = nextSave(state, [X0, Y2, W]);
    expect(r.conflicts).toEqual([]);
    expect(labels(r)).toEqual(['Xme', 'Y2', 'W von anderen']);
  });
  it('C: andere loeschen W -> W geloescht', () => {
    const r = nextSave(state, [X0, Y1]);
    expect(r.conflicts).toEqual([]);
    expect(labels(r)).toEqual(['Xme', 'Y1']);
  });
  it('D: andere setzen Y auf Y0 zurueck -> Y0', () => {
    const r = nextSave(state, [X0, Y0, W]);
    expect(r.conflicts).toEqual([]);
    expect(labels(r)).toEqual(['Xme', 'Y0', 'W von anderen']);
  });
  it('E: andere loeschen Y -> geloescht', () => {
    const r = nextSave(state, [X0, W]);
    expect(r.conflicts).toEqual([]);
    expect(labels(r)).toEqual(['Xme', 'W von anderen']);
  });
  it('X: andere aendern X -> Konflikt', () => {
    const r = nextSave(state, [X2, Y1, W]);
    expect(r.conflicts.map((c) => [c.id, c.mine, c.theirs])).toEqual([['x', Xme, X2]]);
  });

  it('nach dem Klick geloescht: Basis behaelt die Fassung vom Klick, Aenderung der anderen -> Konflikt', () => {
    const s = rebaseState(config, from, { data: { cat: [Y0] }, pages: { imp: P } }, merged);
    expect(s.data.cat).toEqual([Y1, W]);
    expect(s.ancestor.data.cat).toEqual([X0, Y1, W]);
    const r = nextSave(s, [X2, Y1, W]);
    expect(r.conflicts.map((c) => [c.id, c.mine, c.theirs])).toEqual([['x', null, X2]]);
    expect(labels(nextSave(s, [X0, Y1, W]))).toEqual(['Y1', 'W von anderen']);
  });

  it('nach dem Klick neu angelegt: kein Basiseintrag', () => {
    const N = { id: 'n', l: 'Neu' };
    const s = rebaseState(config, from, { data: { cat: [X0, Y0, N] }, pages: { imp: P } }, merged);
    expect(s.data.cat).toEqual([X0, Y1, W, N]);
    expect(s.ancestor.data.cat).toEqual([X0, Y1, W]);
  });

  it('nicht bearbeitet: merged unveraendert, keine Basis', () => {
    const s = rebaseState(config, from, from, merged);
    expect(s.data).toBe(merged.data);
    expect(s.pages).toBe(merged.pages);
    expect(s.ancestor).toBeNull();
  });

  it('Textseite nach dem Klick bearbeitet: Basis = Seite vom Klick', () => {
    const s = rebaseState(config, from, { data: from.data, pages: { imp: { ...P, html: '<p>mein</p>' } } }, merged);
    expect(s.pages.imp.html).toBe('<p>mein</p>');
    expect(s.ancestor).toEqual({ data: {}, pages: { imp: P } });
  });
});

describe('pruneAncestor', () => {
  const ancestor = { data: { cat: [X0, Y1, W] }, pages: { imp: P } };
  // gespeichert wurde u. a. die Fassung der anderen (X2, Seitentitel T2); meine neueren Aenderungen nicht
  const P2 = { ...P, title: 'T2' };
  it('bleibt, solange die Eintraege ungespeichert sind', () => {
    const saved = { data: { cat: [X2, Y1, W] }, pages: { imp: P2 } };
    const work = { data: { cat: [Xme, Y1, W] }, pages: { imp: { ...P2, html: '<p>m</p>' } } };
    expect(pruneAncestor(config, ancestor, saved, work)).toEqual(ancestor);
  });
  it('entfaellt, wenn der Arbeitsstand gespeichert ist', () => {
    const saved = { data: { cat: [Xme, Y1, W] }, pages: { imp: P2 } };
    expect(pruneAncestor(config, ancestor, saved, saved)).toBeNull();
  });
  it('nur fuer die gespeicherten Eintraege/Seiten', () => {
    const saved = { data: { cat: [Xme, Y1, W] }, pages: { imp: P2 } };
    const work = { data: { cat: [Xme, Y1, W] }, pages: { imp: { ...P2, html: '<p>m</p>' } } };
    expect(pruneAncestor(config, ancestor, saved, work)).toEqual({ data: {}, pages: { imp: P } });
  });
  it('Basis gleich dem Gespeicherten: nichts mehr zu schuetzen', () => {
    const saved = { data: { cat: [X0, Y1, W] }, pages: { imp: P } };
    const work = { data: { cat: [Xme, Y1, W] }, pages: { imp: P } };
    expect(pruneAncestor(config, ancestor, saved, work)).toBeNull();
  });
  it('null bleibt null', () => {
    expect(pruneAncestor(config, null, merged, merged)).toBeNull();
  });
});

describe('rebaseState / pruneAncestor: Einstellungen', () => {
  const cfg = { collections: [], pages: [], settings: [{ name: 'carousel', file: 'carousel.json', fields: [] }] };
  it('waehrend des Speicherns geaenderte Einstellung: neuere Fassung bleibt, Basis = Fassung vom Klick', () => {
    const from = { data: {}, pages: {}, settings: { carousel: { count: 5 } } };
    const cur = { data: {}, pages: {}, settings: { carousel: { count: 6 } } };
    const merged = { data: {}, pages: {}, settings: { carousel: { count: 5 } } };
    const r = rebaseState(cfg, from, cur, merged);
    expect(r.settings.carousel).toEqual({ count: 6 });
    expect(r.ancestor.settings.carousel).toEqual({ count: 5 });
    const other = { data: {}, pages: {}, settings: { carousel: { count: 7 } } };
    expect(pruneAncestor(cfg, r.ancestor, other, cur)).toEqual({ data: {}, pages: {}, settings: { carousel: { count: 5 } } });
    expect(pruneAncestor(cfg, r.ancestor, merged, cur)).toBeNull();
    expect(pruneAncestor(cfg, r.ancestor, cur, cur)).toBeNull();
  });
});
