import { useEffect, useRef, useState } from 'react';

const resourcesText = (n) => (n === 1 ? '1 Ressource' : `${n} Ressourcen`);

// Modaler Dialog zum Loeschen. plan = Ergebnis von planDelete,
// options = [{ id, label }] moegliche Ziele (nur im Modus reassign).
export default function DeleteDialog({ plan, options, onConfirm, onCancel }) {
  const [target, setTarget] = useState('');
  const dialogRef = useRef(null);
  const firstRef = useRef(null);
  const n = plan.affected.length;
  const reassign = plan.mode === 'reassign';

  useEffect(() => { firstRef.current?.focus(); }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
      return;
    }
    if (e.key !== 'Tab') return;
    // Fokus im Dialog halten.
    const items = [...dialogRef.current.querySelectorAll('select, button:not(:disabled)')];
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const text = {
    reassign: `Dieser Fachbereich wird von ${resourcesText(n)} verwendet. Wählen Sie, wohin sie verschoben werden:`,
    remove: `Wird aus ${resourcesText(n)} entfernt.`,
    nullify: n === 1 ? '1 Ressource verliert diese Lizenz.' : `${n} Ressourcen verlieren diese Lizenz.`,
    free: 'Wirklich löschen?',
  }[plan.mode];

  return (
    <div className="dialog-backdrop">
      <div ref={dialogRef} className="dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title" onKeyDown={onKeyDown}>
        <h2 id="delete-title">Eintrag löschen</h2>
        <p>{text}</p>
        {reassign && (
          <p>
            <label htmlFor="delete-target">Verschieben nach</label>
            <select id="delete-target" ref={firstRef} value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Bitte wählen</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" onClick={onCancel}>Abbrechen</button>
          <button type="button" ref={reassign ? undefined : firstRef} disabled={reassign && !target}
            onClick={() => onConfirm(reassign ? { reassignTo: target } : {})}>
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}
