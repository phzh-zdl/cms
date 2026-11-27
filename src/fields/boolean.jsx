import { aria, ErrorLine, fieldId } from './FieldFrame.jsx';

export const validate = () => null;

export function Editor({ field, value, onChange, error }) {
  return (
    <div className="field field-check">
      <input type="checkbox" {...aria(field, error)} checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={fieldId(field)}>{field.label}</label>
      <ErrorLine field={field} error={error} />
    </div>
  );
}

export default { Editor, validate, empty: false };
