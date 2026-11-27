import FieldFrame, { aria } from './FieldFrame.jsx';
import { REQUIRED } from './rules.js';

// Ganzzahlig, wenn step 1 ist (oder integer: true).
const wholeOnly = (field) => field.integer === true || field.step === 1;

function rangeError(value, { min, max }) {
  const hasMin = typeof min === 'number';
  const hasMax = typeof max === 'number';
  if (hasMin && hasMax && (value < min || value > max)) return `Bitte einen Wert zwischen ${min} und ${max} eingeben.`;
  if (hasMin && !hasMax && value < min) return `Bitte einen Wert ab ${min} eingeben.`;
  if (hasMax && !hasMin && value > max) return `Bitte einen Wert bis ${max} eingeben.`;
  return null;
}

export function validate(value, field) {
  if (value == null || value === '') return field.required ? REQUIRED : null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Muss eine Zahl sein.';
  if (wholeOnly(field) && !Number.isInteger(value)) return 'Bitte eine ganze Zahl eingeben.';
  return rangeError(value, field);
}

// Gespeichert wird eine JSON-Zahl (nie Text); leeres Feld = null.
export function Editor({ field, value, onChange, error }) {
  return (
    <FieldFrame field={field} error={error}>
      <input type="number" {...aria(field, error)} value={value ?? ''}
        min={field.min} max={field.max} step={field.step} inputMode={wholeOnly(field) ? 'numeric' : 'decimal'}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
    </FieldFrame>
  );
}

export default { Editor, validate, empty: null };
