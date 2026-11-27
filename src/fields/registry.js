// Feld-Typen: je Typ ein Editor, eine Pruefregel und ein Leerwert.
import text from './text.jsx';
import textarea from './textarea.jsx';
import slug from './slug.jsx';
import uuid from './uuid.jsx';
import color from './color.jsx';
import urlHttps from './urlHttps.jsx';
import boolean from './boolean.jsx';
import number from './number.jsx';
import reference from './reference.jsx';
import referenceMulti from './referenceMulti.jsx';
import placeholder from './placeholder.jsx';

export { deriveSlug } from './slugify.js';

export const fieldTypes = {
  text,
  textarea,
  slug,
  uuid,
  color,
  'url-https': urlHttps,
  boolean,
  number,
  reference,
  'reference-multi': referenceMulti,
  image: placeholder,
  richtext: placeholder,
};

// Meldungen je Feldname; leer = gueltig.
export function validateEntry(fields, entry, ctx) {
  const errors = {};
  for (const field of fields) {
    const type = fieldTypes[field.type];
    const msg = type.validate(entry[field.name] ?? type.empty, field, ctx);
    if (msg) errors[field.name] = msg;
  }
  return errors;
}

// Neuer Eintrag mit Leerwerten; uuid-ids sofort, slug-ids entstehen aus dem Namen.
export function newEntry(collection) {
  const entry = {};
  for (const f of collection.fields) {
    const empty = fieldTypes[f.type].empty;
    entry[f.name] = Array.isArray(empty) ? [] : empty;
  }
  const key = collection.key ?? 'id';
  entry[key] = collection.idField?.type === 'uuid' ? crypto.randomUUID() : '';
  return entry;
}
