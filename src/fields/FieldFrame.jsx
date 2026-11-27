// Gemeinsamer Rahmen: Beschriftung, Eingabe(n) und Fehlermeldung unter dem Feld.
export const fieldId = (field) => `field-${field.name}`;
export const errorId = (field) => `${fieldId(field)}-error`;

export function ErrorLine({ field, error }) {
  return error ? <p className="field-error" id={errorId(field)}>{error}</p> : null;
}

export default function FieldFrame({ field, error, children }) {
  return (
    <div className="field">
      <label htmlFor={fieldId(field)}>{field.label}{field.required ? ' *' : ''}</label>
      {children}
      <ErrorLine field={field} error={error} />
    </div>
  );
}

// aria-Attribute fuer ein Eingabefeld
export const aria = (field, error, extra) => ({
  id: fieldId(field),
  'aria-invalid': error ? 'true' : undefined,
  'aria-describedby': [extra, error ? errorId(field) : null].filter(Boolean).join(' ') || undefined,
});
