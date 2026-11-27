import FieldFrame, { aria } from './FieldFrame.jsx';
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

// Nach dem ersten Speichern unveraenderlich: dann nur noch angezeigt.
export function Editor({ field, value, onChange, ctx, error }) {
  return (
    <FieldFrame field={field} error={error}>
      <input type="text" {...aria(field, error)} value={value ?? ''} readOnly={!ctx.isNew}
        onChange={(e) => onChange(e.target.value)} />
    </FieldFrame>
  );
}

export default { Editor, validate, empty: '' };
