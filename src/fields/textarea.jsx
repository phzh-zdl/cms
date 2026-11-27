import FieldFrame, { aria, fieldId } from './FieldFrame.jsx';
import { length } from './rules.js';
import { validate } from './text.jsx';

export function Editor({ field, value, onChange, error }) {
  const counterId = `${fieldId(field)}-count`;
  return (
    <FieldFrame field={field} error={error}>
      <textarea rows={5} {...aria(field, error, field.maxLength != null ? counterId : null)}
        value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      {field.maxLength != null && (
        <p className="field-count" id={counterId} aria-live="polite">{length(value ?? '')} / {field.maxLength}</p>
      )}
    </FieldFrame>
  );
}

export default { Editor, validate, empty: '' };
