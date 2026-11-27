import { ErrorLine, fieldId, errorId } from './FieldFrame.jsx';
import { MISSING_TARGET, REQUIRED, targetHas } from './rules.js';
import { referenceOptions } from './options.js';

export function validate(value, field, ctx) {
  const ids = Array.isArray(value) ? value : [];
  if (ids.length === 0) return field.required ? REQUIRED : null;
  return ids.every((id) => targetHas(ctx, field.to, id)) ? null : MISSING_TARGET;
}

export function Editor({ field, value, onChange, ctx, error }) {
  const ids = Array.isArray(value) ? value : [];
  const toggle = (id, on) => onChange(on ? [...ids, id] : ids.filter((x) => x !== id));
  return (
    <fieldset id={fieldId(field)} className="field" aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? errorId(field) : undefined}>
      <legend>{field.label}{field.required ? ' *' : ''}</legend>
      {referenceOptions(field, ctx).map((o) => (
        <label key={o.id} className="check-option">
          <input type="checkbox" checked={ids.includes(o.id)} onChange={(e) => toggle(o.id, e.target.checked)} />
          {o.title}
        </label>
      ))}
      <ErrorLine field={field} error={error} />
    </fieldset>
  );
}

export default { Editor, validate, empty: [] };
