// Bild und formatierter Text: Bearbeitung folgt spaeter.
export const validate = () => null;

export function Editor({ field }) {
  return (
    <div className="field">
      <p className="field-label">{field.label}</p>
      <p className="field-todo">Folgt in einem späteren Schritt.</p>
    </div>
  );
}

export default { Editor, validate, empty: null };
