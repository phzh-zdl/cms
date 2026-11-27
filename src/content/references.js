// Wer verweist auf einen Eintrag? Eine Quelle fuer die Loeschregeln und "Verwendet von" (rein).
const isReference = (f) => f.type === 'reference' || f.type === 'reference-multi';

export const references = (value, id) => (Array.isArray(value) ? value.includes(id) : value === id);

// Zeilen einer Sammlung, die in einem der Felder auf id zeigen - in Sammlungsreihenfolge, ohne Doppel.
export const rowsReferencing = (rows, fieldNames, id) =>
  (rows ?? []).filter((row) => fieldNames.some((name) => references(row[name], id)));

// Je Sammlung mit Verweisfeldern auf targetId: { collection, fields, rows } (rows aus data = Arbeitsstand).
export function usagesOf(data, collections, targetId, id) {
  return collections
    .map((collection) => ({ collection, fields: collection.fields.filter((f) => isReference(f) && f.to === targetId) }))
    .filter(({ fields }) => fields.length > 0)
    .map(({ collection, fields }) => ({
      collection,
      fields,
      rows: rowsReferencing(data[collection.id], fields.map((f) => f.name), id),
    }));
}
