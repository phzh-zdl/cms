import FieldFrame, { aria, fieldId } from './FieldFrame.jsx';
import FixedField from './FixedField.jsx';
import { SLUG_RE, requiredCheck } from './rules.js';

export function validate(value, field, ctx) {
  const r = requiredCheck(value, field);
  if (r !== undefined) return r;
  if (!SLUG_RE.test(value)) return 'Nur Kleinbuchstaben, Ziffern, - und _ (max. 32 Zeichen).';
  const rows = ctx.data?.[ctx.collection?.id] ?? [];
  const key = ctx.collection?.key ?? field.name;
  if (rows.filter((row) => row[key] === value).length > 1) return 'Diese Kennung ist bereits vergeben.';
  return null;
}

export const HINT_NEW = 'Wird aus der Bezeichnung vorgeschlagen und kann vor dem ersten Speichern angepasst werden. Danach ist sie fest.';
export const HINT_FIXED = 'Wurde beim Anlegen festgelegt und kann nicht mehr geändert werden, weil andere Einträge darauf verweisen.';

// Neu: Eingabefeld, das EntryForm aus dem Titelfeld vorschlaegt, bis es von Hand geaendert wird.
// Nach dem ersten Speichern unveraenderlich: dann nur noch als Text angezeigt.
export function Editor({ field, value, onChange, ctx, error }) {
  if (!ctx.isNew) return <FixedField field={field} value={value} hint={HINT_FIXED} error={error} />;
  const hintId = `${fieldId(field)}-hint`;
  return (
    <FieldFrame field={field} error={error}>
      <input type="text" {...aria(field, error, hintId)} value={value ?? ''} autoComplete="off"
        onChange={(e) => onChange(e.target.value)} />
      <p className="hint" id={hintId}>{HINT_NEW}</p>
    </FieldFrame>
  );
}

export default { Editor, validate, empty: '' };
