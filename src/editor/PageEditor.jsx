import { useId, useState } from 'react';
import RichTextField from '../fields/RichTextField.jsx';
import { sanitizeHtml } from '../richtext/sanitize.js';

// Bearbeitet eine Textseite ({ id, title, html }) direkt im Arbeitsstand.
export default function PageEditor({ page, onChange, toolbar = 'basic', pageIds = [] }) {
  const [preview, setPreview] = useState(false);
  const id = useId();
  return (
    <div className="page-editor">
      <div className="field">
        <label htmlFor={`${id}-title`}>Titel</label>
        <input id={`${id}-title`} type="text" value={page.title ?? ''} onChange={(e) => onChange({ ...page, title: e.target.value })} />
      </div>
      <button type="button" onClick={() => setPreview((p) => !p)}>{preview ? 'Bearbeiten' : 'Vorschau anzeigen'}</button>
      {preview
        // Sicher: der Inhalt geht vorher durch sanitizeHtml (Allowlist, nur https/mailto/relative Links).
        // Dies ist die einzige Stelle mit dangerouslySetInnerHTML.
        ? <div className="page-preview" dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.html) }} />
        : <RichTextField label="Inhalt" value={page.html ?? ''} toolbar={toolbar} pageIds={pageIds}
            onChange={(html) => onChange({ ...page, html })} />}
    </div>
  );
}
