import FieldFrame, { aria } from './FieldFrame.jsx';
import { REQUIRED } from './rules.js';

export function validate(value, field) {
  if (value == null || value === '') return field.required ? REQUIRED : null;
  return typeof value === 'number' && Number.isFinite(value) ? null : 'Muss eine Zahl sein.';
}

export function Editor({ field, value, onChange, error }) {
  return (
    <FieldFrame field={field} error={error}>
      <input type="number" {...aria(field, error)} value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
    </FieldFrame>
  );
}

export default { Editor, validate, empty: null };
