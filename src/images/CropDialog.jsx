import { useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { encodeCropped } from './encode.js';

export const MIN_WIDTH = 640;
const ASPECT = 5 / 3;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Das Bild konnte nicht gelesen werden.'));
    img.src = src;
  });
}

// Modaler Editor: Ausschnitt waehlen oder das ganze Bild auf Fachbereichsfarbe zeigen.
// src = Object-URL des gewaehlten Bildes; onApply(bytes: Uint8Array) liefert das WebP.
export default function CropDialog({ src, background, onApply, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState('crop');
  const [area, setArea] = useState(null);
  const [naturalWidth, setNaturalWidth] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const dialogRef = useRef(null);
  const firstRef = useRef(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); onCancel(); return; }
    if (e.key !== 'Tab') return;
    const items = [...dialogRef.current.querySelectorAll('input:not(:disabled), button:not(:disabled)')];
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const width = mode === 'contain' ? naturalWidth : area?.width;
  const blurry = width != null && width < MIN_WIDTH;

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      const image = await loadImage(src);
      const blob = await encodeCropped(image, area, { mode, background });
      onApply(new Uint8Array(await blob.arrayBuffer()));
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop">
      <div ref={dialogRef} className="dialog dialog-wide" role="dialog" aria-modal="true"
        aria-labelledby="crop-title" onKeyDown={onKeyDown}>
        <h2 id="crop-title">Bild zuschneiden</h2>
        <fieldset className="crop-mode">
          <legend>Darstellung</legend>
          <label className="check-option">
            <input ref={firstRef} type="radio" name="crop-mode" value="crop" checked={mode === 'crop'}
              onChange={() => setMode('crop')} /> Zuschneiden
          </label>
          <label className="check-option">
            <input type="radio" name="crop-mode" value="contain" checked={mode === 'contain'}
              onChange={() => setMode('contain')} /> Ganzes Bild zeigen
          </label>
        </fieldset>
        {mode === 'crop' ? (
          <>
            <div className="crop-area" style={{ position: 'relative', height: '18rem' }}>
              <Cropper image={src} crop={crop} zoom={zoom} aspect={ASPECT}
                onCropChange={setCrop} onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setArea(pixels)}
                onMediaLoaded={(m) => setNaturalWidth(m.naturalWidth)} />
            </div>
            <div className="crop-zoom">
              <label htmlFor="crop-zoom">Zoom</label>
              <input id="crop-zoom" type="range" min={1} max={3} step={0.1} value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))} />
            </div>
          </>
        ) : (
          <div className="crop-contain" style={{
            background, aspectRatio: '5 / 3', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src={src} alt="Vorschau: ganzes Bild" style={{ maxWidth: '100%', maxHeight: '100%' }}
              onLoad={(e) => setNaturalWidth(e.currentTarget.naturalWidth)} />
          </div>
        )}
        {blurry && <p role="status" className="crop-warning">Bild wird unscharf wirken</p>}
        {error && <p role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="button" onClick={onCancel}>Abbrechen</button>
          <button type="button" className="btn-primary" onClick={apply} disabled={busy || (mode === 'crop' && !area)}>Übernehmen</button>
        </div>
      </div>
    </div>
  );
}
