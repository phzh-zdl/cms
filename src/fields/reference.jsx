import FieldFrame, { aria } from './FieldFrame.jsx';
import { MISSING_TARGET, isBlank, requiredCheck, targetHas } from './rules.js';
import { referenceOptions } from './options.js';

export function validate(value, field, ctx) {
  const r = requiredCheck(isBlank(value) ? null : value, field);
  if (r !== undefined) return r;
  return targetHas(ctx, field.to, value) ? null : MISSING_TARGET;
}

export function Editor({ field, value, onChange, ctx, error }) {
  const opts = referenceOptions(field, ctx);
  const known = value == null || opts.some((o) => o.id === value);
  return (
    <FieldFrame field={field} error={error}>
      <select {...aria(field, error)} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        {!field.required && <option value="">— keine Auswahl —</option>}
        {field.required && value == null && <option value="">— bitte wählen —</option>}
        {!known && <option value={value}>{String(value)} (unbekannt)</option>}
        {opts.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
      </select>
    </FieldFrame>
  );
}

export default { Editor, validate, empty: null };
