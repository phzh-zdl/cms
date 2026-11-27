// Leiste oben im Editor: Stand + "Speichern" + Rueckmeldung.
// result: null | { kind: 'success' | 'info' | 'error', text } ; blocked: Sammlungs-Labels mit Fehlern oder null.
export default function SaveBar({ dirty, saving, onSave, result, blocked, draftFailed }) {
  const state = saving ? 'Wird gespeichert …' : dirty ? 'Ungespeicherte Änderungen' : 'Alle Änderungen gespeichert.';
  return (
    <div className="save-bar">
      <span className="save-state">{state}</span>
      <button type="button" onClick={onSave} disabled={saving}>Speichern</button>
      {blocked && (
        <div role="alert" className="error">
          <p>Bitte zuerst die markierten Fehler beheben.</p>
          <ul>{blocked.map((label) => <li key={label}>{label}</li>)}</ul>
        </div>
      )}
      {result && (result.kind === 'error'
        ? <p role="alert" className="error">{result.text}</p>
        : <p role="status">{result.text}</p>)}
      {draftFailed && <p role="status" className="note">Entwurf konnte nicht lokal gesichert werden.</p>}
    </div>
  );
}
