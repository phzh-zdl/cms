import { useEffect, useId, useRef, useState } from 'react';
import { linkTarget } from './linkTarget.js';

export const MSG_LINK = 'Nur https-Links oder E-Mail-Adressen';

// Kleines Formular statt window.prompt: Anzeigetext und Linkadresse eingeben, uebernehmen, abbrechen oder entfernen.
export default function LinkForm({ initial = '', initialText = '', onSubmit, onCancel, onRemove }) {
  const [url, setUrl] = useState(initial);
  const [label, setLabel] = useState(initialText);
  const [error, setError] = useState('');
  const id = useId();
  const input = useRef(null);
  const labelInput = useRef(null);
  useEffect(() => { (initialText ? input : labelInput).current?.focus(); }, []);

  const submit = (e) => {
    e.preventDefault();
    const target = linkTarget(url);
    if (!target) { setError(MSG_LINK); input.current?.focus(); return; }
    onSubmit({ href: target, text: label.trim() || target.replace(/^mailto:/i, '') });
  };

  return (
    <form className="link-form" onSubmit={submit} onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }} noValidate>
      <label htmlFor={`${id}-text`}>Anzeigetext</label>
      <input id={`${id}-text`} ref={labelInput} type="text" value={label} onChange={(e) => setLabel(e.target.value)} />
      <label htmlFor={`${id}-url`}>Linkadresse</label>
      <input id={`${id}-url`} ref={input} type="text" value={url} aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-err` : undefined} onChange={(e) => { setUrl(e.target.value); setError(''); }} />
      {error && <p className="field-error" id={`${id}-err`} role="alert">{error}</p>}
      <div className="link-form-actions">
        <button type="submit" className="btn-primary">Übernehmen</button>
        <button type="button" onClick={onCancel}>Abbrechen</button>
        {initial && <button type="button" onClick={onRemove}>Link entfernen</button>}
      </div>
    </form>
  );
}
