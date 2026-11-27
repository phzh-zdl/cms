import FieldFrame, { aria } from './FieldFrame.jsx';
import { requiredCheck, maxLengthError } from './rules.js';

export function validate(value, field) {
  const r = requiredCheck(value, field);
  return r !== undefined ? r : maxLengthError(value, field);
}

export function Editor({ field, value, onChange, error }) {
  return (
    <FieldFrame field={field} error={error}>
      <input type="text" {...aria(field, error)} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </FieldFrame>
  );
}

export default { Editor, validate, empty: '' };
