import { useEffect, useId, useRef, useState } from 'react';
import { linkTarget } from './linkTarget.js';

export const MSG_LINK = 'Nur https-Links oder E-Mail-Adressen';

// Kleines Formular statt window.prompt: Linkadresse eingeben, uebernehmen, abbrechen oder entfernen.
export default function LinkForm({ initial = '', onSubmit, onCancel, onRemove }) {
  const [url, setUrl] = useState(initial);
  const [error, setError] = useState('');
  const id = useId();
  const input = useRef(null);
  useEffect(() => { input.current?.focus(); }, []);

  const submit = (e) => {
    e.preventDefault();
    const target = linkTarget(url);
    if (!target) { setError(MSG_LINK); input.current?.focus(); return; }
    onSubmit(target);
  };

  return (
    <form className="link-form" onSubmit={submit} onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }} noValidate>
      <label htmlFor={`${id}-url`}>Linkadresse</label>
      <input id={`${id}-url`} ref={input} type="text" value={url} aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-err` : undefined} onChange={(e) => { setUrl(e.target.value); setError(''); }} />
      {error && <p className="field-error" id={`${id}-err`} role="alert">{error}</p>}
      <div className="link-form-actions">
        <button type="submit">Übernehmen</button>
        <button type="button" onClick={onCancel}>Abbrechen</button>
        {initial && <button type="button" onClick={onRemove}>Link entfernen</button>}
      </div>
    </form>
  );
}
