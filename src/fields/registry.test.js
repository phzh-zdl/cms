import { describe, it, expect } from 'vitest';
import { fieldTypes, validateEntry, deriveSlug } from './registry.js';

const data = {
  cats: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
  items: [{ id: 'x' }, { id: 'y' }],
};
const ctx = { data, collection: { id: 'items', key: 'id' }, entryId: 'x', isNew: false };
const v = (type, value, field = {}) => fieldTypes[type].validate(value, { name: 'f', type, ...field }, ctx);

describe('Feld-Typen: validate', () => {
  it('text: Pflichtfeld und maxLength zaehlt Zeichen', () => {
    expect(v('text', '  ', { required: true })).toBe('Pflichtfeld.');
    expect(v('text', '', {})).toBeNull();
    expect(v('text', 'ok', { required: true, maxLength: 5 })).toBeNull();
    expect(v('text', '😀😀😀', { maxLength: 3 })).toBeNull();
    expect(v('text', '😀😀😀😀', { maxLength: 3 })).toBe('Höchstens 3 Zeichen (aktuell 4).');
  });
  it('textarea: 500 gueltig, 501 nicht', () => {
    expect(v('textarea', 'a'.repeat(500), { maxLength: 500 })).toBeNull();
    expect(v('textarea', 'a'.repeat(501), { maxLength: 500 })).toBe('Höchstens 500 Zeichen (aktuell 501).');
  });
  it('slug: Format und Eindeutigkeit', () => {
    const f = { required: true };
    expect(v('slug', 'natur-1_x', f)).toBeNull();
    expect(v('slug', 'Natur', f)).toMatch(/Kleinbuchstaben/);
    expect(v('slug', 'a'.repeat(33), f)).toMatch(/max. 32/);
    expect(v('slug', '', f)).toBe('Pflichtfeld.');
    const dup = { ...ctx, data: { items: [{ id: 'x' }, { id: 'x' }] } };
    expect(fieldTypes.slug.validate('x', { name: 'id', type: 'slug', required: true }, dup))
      .toBe('Diese Kennung ist bereits vergeben.');
    expect(v('slug', 'x', f)).toBeNull();
  });
  it('color', () => {
    expect(v('color', '#aBc123')).toBeNull();
    expect(v('color', '#12345')).toBe('Farbe im Format #rrggbb.');
    expect(v('color', '', { required: true })).toBe('Pflichtfeld.');
  });
  it('url-https', () => {
    expect(v('url-https', 'https://phzh.ch')).toBeNull();
    expect(v('url-https', 'http://phzh.ch')).toBe('Muss mit https:// beginnen.');
    expect(v('url-https', 'javascript:alert(1)')).toBe('Muss mit https:// beginnen.');
    expect(v('url-https', '')).toBeNull();
  });
  it('number und boolean', () => {
    expect(v('number', null)).toBeNull();
    expect(v('number', null, { required: true })).toBe('Pflichtfeld.');
    expect(v('number', 0, { required: true })).toBeNull();
    expect(v('number', NaN)).toBe('Muss eine Zahl sein.');
    expect(v('boolean', false, { required: true })).toBeNull();
  });
  it('reference', () => {
    expect(v('reference', 'a', { to: 'cats' })).toBeNull();
    expect(v('reference', 'zzz', { to: 'cats' })).toBe('Unbekannter Eintrag.');
    expect(v('reference', null, { to: 'cats', required: true })).toBe('Pflichtfeld.');
    expect(v('reference', null, { to: 'cats' })).toBeNull();
  });
  it('reference-multi: required heisst mindestens eins', () => {
    const f = { to: 'cats', required: true };
    expect(v('reference-multi', [], f)).toBe('Pflichtfeld.');
    expect(v('reference-multi', ['a', 'b'], f)).toBeNull();
    expect(v('reference-multi', ['a', 'q'], f)).toBe('Unbekannter Eintrag.');
    expect(v('reference-multi', [], { to: 'cats' })).toBeNull();
  });
  it('empty-Werte', () => {
    expect(fieldTypes.text.empty).toBe('');
    expect(fieldTypes.boolean.empty).toBe(false);
    expect(fieldTypes.number.empty).toBeNull();
    expect(fieldTypes.reference.empty).toBeNull();
    expect(fieldTypes['reference-multi'].empty).toEqual([]);
  });
});

describe('number: min, max, step', () => {
  const f = { required: true, min: 5, max: 20, step: 1 };
  it('Bereich und ganze Zahl', () => {
    expect(v('number', 5, f)).toBeNull();
    expect(v('number', 20, f)).toBeNull();
    expect(v('number', 4, f)).toBe('Bitte einen Wert zwischen 5 und 20 eingeben.');
    expect(v('number', 21, f)).toBe('Bitte einen Wert zwischen 5 und 20 eingeben.');
    expect(v('number', 7.5, f)).toBe('Bitte eine ganze Zahl eingeben.');
    expect(v('number', 7.5, {})).toBeNull();
    expect(v('number', 3, { min: 5 })).toBe('Bitte einen Wert ab 5 eingeben.');
    expect(v('number', 30, { max: 20 })).toBe('Bitte einen Wert bis 20 eingeben.');
  });
  it('Eingabefeld traegt min, max, step und speichert eine Zahl', () => {
    const { Editor } = fieldTypes.number;
    const el = Editor({ field: { name: 'n', label: 'N', ...f }, value: 7, onChange: () => {} });
    const input = el.props.children;
    expect(input.props).toMatchObject({ min: 5, max: 20, step: 1, type: 'number' });
  });
});

describe('validateEntry', () => {
  it('liefert Meldungen je Feld, leer wenn gueltig', () => {
    const fields = [{ name: 't', type: 'text', required: true }, { name: 'u', type: 'url-https' }];
    expect(validateEntry(fields, { t: '', u: 'http://x' }, ctx)).toEqual({ t: 'Pflichtfeld.', u: 'Muss mit https:// beginnen.' });
    expect(validateEntry(fields, { t: 'a', u: '' }, ctx)).toEqual({});
  });
});

describe('deriveSlug', () => {
  it.each([
    ['Natur, Mensch & Gesellschaft', 'natur-mensch-gesellschaft'],
    ['Größe für Äpfel & Öl', 'groesse-fuer-aepfel-oel'],
    ['Café Ñandú', 'cafe-nandu'],
    ['  --Hallo--  ', 'hallo'],
    ['a'.repeat(31) + ' bbb', 'a'.repeat(31)],
    ['', ''],
  ])('%s -> %s', (input, out) => expect(deriveSlug(input)).toBe(out));
});
