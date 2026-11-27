import { useEffect, useRef } from 'react';

// Modaler Bestaetigungsdialog im Stil des Loeschdialogs (Fokus im Dialog, Escape = Abbrechen).
// Den Fokus nach dem Schliessen setzt die aufrufende Ansicht.
export default function ConfirmDialog({ title, text, confirmLabel, onConfirm, onCancel }) {
  const dialogRef = useRef(null);
  const firstRef = useRef(null);
  useEffect(() => { firstRef.current?.focus(); }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...dialogRef.current.querySelectorAll('button:not(:disabled)')];
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  return (
    <div className="dialog-backdrop">
      <div ref={dialogRef} className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title"
        aria-describedby="confirm-text" onKeyDown={onKeyDown}>
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-text">{text}</p>
        <div className="dialog-actions">
          <button type="button" className="btn-primary" ref={firstRef} onClick={onConfirm}>{confirmLabel}</button>
          <button type="button" onClick={onCancel}>Abbrechen</button>
        </div>
      </div>
    </div>
  );
}
