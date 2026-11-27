import { useRef, useState } from 'react';
import { fieldTypes, validateEntry, deriveSlug } from '../fields/registry.js';
import { keyOf, makeCtx } from './entryState.js';
import DeleteDialog from './DeleteDialog.jsx';

// Bearbeitet einen Eintrag direkt im Arbeitsstand (onChange bei jeder Eingabe).
export default function EntryForm({ collection, entry, data, collections, isNew, onChange, onBack, planFor, onDelete }) {
  const ctx = makeCtx({ data, collections, collection, entry, isNew });
  const errors = validateEntry(collection.fields, entry, ctx);
  const key = keyOf(collection);
  const [plan, setPlan] = useState(null);
  const deleteRef = useRef(null);
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

  const cancelDelete = () => {
    setPlan(null);
    // Der Dialog ist beim Schliessen noch eingehaengt; Fokus erst danach zurueck.
    queueMicrotask(() => deleteRef.current?.focus());
  };
  const titleOf = (row) => String(row[collection.titleField] ?? '').trim() || row[key];
  const options = plan?.mode === 'reassign'
    ? (data[collection.id] ?? []).filter((r) => r[key] !== entry[key])
      .map((r) => ({ id: r[key], label: titleOf(r) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'de'))
    : [];

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
      {onDelete && (
        <button type="button" ref={deleteRef} onClick={() => setPlan(planFor(entry[key]))}>Löschen</button>
      )}
      {plan && (
        <DeleteDialog plan={plan} options={options} onCancel={cancelDelete}
          onConfirm={(opts) => onDelete(entry[key], opts)} />
      )}
    </form>
  );
}
