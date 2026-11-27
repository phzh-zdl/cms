import { useEffect, useRef, useState } from 'react';
import FieldFrame, { aria } from './FieldFrame.jsx';
import { isBlank, requiredCheck } from './rules.js';
import { detectImageType } from '../images/detect.js';
import CropDialog from '../images/CropDialog.jsx';

export const MSG_INPUT = 'Nur PNG, JPEG, WebP oder GIF bis 5 MB';
const MAX_BYTES = 5 * 1024 * 1024;
const FALLBACK_COLOR = '#f3f4f7';

export const validate = (value, field) => requiredCheck(isBlank(value) ? null : value, field) ?? null;

// Farbe des Eintrags, auf den das Feld colorFrom zeigt (z. B. category_id -> Fachbereichsfarbe).
function backgroundColor(field, ctx) {
  const source = ctx.collection?.fields.find((f) => f.name === field.colorFrom);
  const id = ctx.entry?.[field.colorFrom];
  if (!source?.to || id == null) return FALLBACK_COLOR;
  const key = ctx.collections?.find((c) => c.id === source.to)?.key ?? 'id';
  return (ctx.data[source.to] ?? []).find((r) => r[key] === id)?.color || FALLBACK_COLOR;
}

export function Editor({ field, value, onChange, ctx, error }) {
  const images = ctx.images;
  const [src, setSrc] = useState(null); // gewaehlte Datei (Object-URL), solange der Editor offen ist
  const [problem, setProblem] = useState(null);
  const [preview, setPreview] = useState(null);
  const triggerRef = useRef(null);
  const inputRef = useRef(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const fullPath = (name) => images.fullPath(field.dir, name);
  const path = value ? fullPath(value) : null;

  useEffect(() => {
    let url = null;
    let cancelled = false;
    setPreview(null);
    if (path) {
      Promise.resolve(imagesRef.current.preview(path)).then((u) => {
        if (cancelled) { if (u) URL.revokeObjectURL(u); return; }
        url = u;
        setPreview(u);
      }).catch(() => {});
    }
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [path]);

  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  // Altes Bild loslassen: ein neues, ungespeichertes verschwindet, ein vorhandenes wird beim Speichern geloescht.
  const release = (name) => {
    if (!name) return;
    const old = fullPath(name);
    if (images.isNew(old)) images.discard(old);
    else images.markRemoved(old);
  };

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setProblem(null);
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (file.size > MAX_BYTES || detectImageType(head) === null) { setProblem(MSG_INPUT); return; }
    setSrc(URL.createObjectURL(file));
  }

  function close() {
    setSrc(null);
    // Der Dialog ist beim Schliessen noch eingehaengt; Fokus erst danach zurueck.
    queueMicrotask(() => triggerRef.current?.focus());
  }

  function apply(bytes) {
    const name = `${crypto.randomUUID()}.webp`;
    images.add(fullPath(name), bytes);
    release(value);
    onChange(name);
    close();
  }

  function remove() {
    release(value);
    onChange(null);
    queueMicrotask(() => triggerRef.current?.focus());
  }

  const title = String(ctx.entry?.[ctx.collection?.titleField] ?? '').trim() || 'Bild';

  return (
    <FieldFrame field={field} error={error}>
      {preview && <img className="image-preview" src={preview} alt={`Vorschau: ${title}`} />}
      <div className="image-actions">
        <button type="button" ref={triggerRef} {...aria(field, error)} onClick={() => inputRef.current?.click()}>
          {value ? 'Bild ersetzen' : 'Bild wählen'}
        </button>
        {value && <button type="button" className="btn-danger" onClick={remove}>Bild entfernen</button>}
      </div>
      <input ref={inputRef} type="file" hidden tabIndex={-1} aria-hidden="true" data-testid="image-input"
        accept="image/png,image/jpeg,image/webp,image/gif" onChange={onFile} />
      {problem && <p role="alert">{problem}</p>}
      {src && <CropDialog src={src} background={backgroundColor(field, ctx)} onApply={apply} onCancel={close} />}
    </FieldFrame>
  );
}

export default { Editor, validate, empty: null };
