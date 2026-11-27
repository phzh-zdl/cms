import { ErrorLine, fieldId } from './FieldFrame.jsx';

// Unveraenderlicher Wert (z. B. eine Kennung) als Text statt eines gesperrten Eingabefelds.
// Bezeichnung und Wert stehen im selben Absatz ("ID natur"), damit Screenreader beides zusammen lesen;
// der Hinweis ist per aria-describedby angehaengt. Der Wert bleibt unveraendert im Eintrag.
export default function FixedField({ field, value, hint, error }) {
  const id = fieldId(field);
  return (
    <div className="field">
      <p className="field-fixed" id={id} aria-describedby={hint ? `${id}-hint` : undefined}>
        <span className="field-label">{field.label}</span>
        <span className="field-value">{value === '' || value == null ? '(keine)' : String(value)}</span>
      </p>
      {hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
      <ErrorLine field={field} error={error} />
    </div>
  );
}
