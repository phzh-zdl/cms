import FieldFrame, { aria } from './FieldFrame.jsx';
import { COLOR_RE, requiredCheck } from './rules.js';

export function validate(value, field) {
  const r = requiredCheck(value, field);
  if (r !== undefined) return r;
  return COLOR_RE.test(value) ? null : 'Farbe im Format #rrggbb.';
}

export function Editor({ field, value, onChange, error }) {
  const text = value ?? '';
  return (
    <FieldFrame field={field} error={error}>
      <div className="color-row">
        <input type="color" aria-label={`${field.label} (Farbwähler)`}
          value={COLOR_RE.test(text) ? text.toLowerCase() : '#000000'} onChange={(e) => onChange(e.target.value)} />
        <input type="text" {...aria(field, error)} value={text} onChange={(e) => onChange(e.target.value)} />
      </div>
    </FieldFrame>
  );
}

export default { Editor, validate, empty: '' };
