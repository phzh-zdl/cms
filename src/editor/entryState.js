// Gemeinsame Hilfen fuer Liste, Formular und (spaeter) das Speichern.
import { validateEntry } from '../fields/registry.js';

export const keyOf = (collection) => collection.key ?? 'id';

// Neu = die Kennung gibt es in den urspruenglich geladenen Daten nicht.
export const isNewEntry = (collection, entry, original) =>
  !(original?.[collection.id] ?? []).some((r) => r[keyOf(collection)] === entry[keyOf(collection)]);

export const makeCtx = ({ data, collections, collection, entry, isNew }) => ({
  data, collections, collection, entryId: entry[keyOf(collection)], isNew,
});

// { [entryId]: { [fieldName]: Meldung } } - nur Eintraege mit Fehlern.
// Task 8 sperrt das Speichern, solange das nicht leer ist.
export function collectionErrors(collection, rows, { data, collections, original }) {
  const out = {};
  for (const entry of rows) {
    const isNew = isNewEntry(collection, entry, original);
    const errors = validateEntry(collection.fields, entry, makeCtx({ data, collections, collection, entry, isNew }));
    if (Object.keys(errors).length > 0) out[entry[keyOf(collection)]] = errors;
  }
  return out;
}
