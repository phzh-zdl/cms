import { fieldTypes, validateEntry, deriveSlug } from '../fields/registry.js';
import { keyOf, makeCtx } from './entryState.js';

// Bearbeitet einen Eintrag direkt im Arbeitsstand (onChange bei jeder Eingabe).
export default function EntryForm({ collection, entry, data, collections, isNew, onChange, onBack }) {
  const ctx = makeCtx({ data, collections, collection, entry, isNew });
  const errors = validateEntry(collection.fields, entry, ctx);
  const key = keyOf(collection);
  const slugId = collection.idField?.type === 'slug';

  const set = (name, value) => {
    const next = { ...entry, [name]: value };
    // Die Kennung folgt dem Namen, solange sie nicht von Hand geaendert wurde.
    if (isNew && slugId && name === collection.titleField
      && (entry[key] === '' || entry[key] === deriveSlug(entry[name]))) {
      next[key] = deriveSlug(value);
    }
    onChange(next);
  };

  return (
    <form className="entry-form" onSubmit={(e) => e.preventDefault()} noValidate>
      <button type="button" onClick={onBack}>Zurück zur Liste</button>
      {collection.fields.map((field) => {
        const { Editor, empty } = fieldTypes[field.type];
        return (
          <Editor key={field.name} field={field} ctx={ctx} error={errors[field.name]}
            value={entry[field.name] ?? empty} onChange={(v) => set(field.name, v)} />
        );
      })}
    </form>
  );
}
