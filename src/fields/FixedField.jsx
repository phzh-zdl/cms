import { ErrorLine, fieldId } from './FieldFrame.jsx';

// Unveraenderlicher Wert (z. B. eine Kennung) als Text statt eines gesperrten Eingabefelds.
// Beschreibungsliste: Bezeichnung (dt) und Wert (dd) sind fuer Hilfsmittel zugeordnet;
// der Hinweis folgt als normaler Text. Der Wert bleibt unveraendert im Eintrag.
export default function FixedField({ field, value, hint, error }) {
  const id = fieldId(field);
  return (
    <div className="field">
      <dl className="field-fixed">
        <dt className="field-label">{field.label}</dt>
        <dd className="field-value" id={id}>{value === '' || value == null ? '(keine)' : String(value)}</dd>
      </dl>
      {hint && <p className="hint">{hint}</p>}
      <ErrorLine field={field} error={error} />
    </div>
  );
}
