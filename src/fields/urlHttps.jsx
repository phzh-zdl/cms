import FieldFrame, { aria } from './FieldFrame.jsx';
import { requiredCheck } from './rules.js';

export function validate(value, field) {
  const r = requiredCheck(value, field);
  if (r !== undefined) return r;
  return String(value).startsWith('https://') ? null : 'Muss mit https:// beginnen.';
}

export function Editor({ field, value, onChange, error }) {
  return (
    <FieldFrame field={field} error={error}>
      <input type="url" {...aria(field, error)} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </FieldFrame>
  );
}

export default { Editor, validate, empty: '' };
