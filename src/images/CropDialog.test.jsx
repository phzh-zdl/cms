import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act, useEffect } from 'react';
import CropDialog from './CropDialog.jsx';
import { encodeCropped } from './encode.js';

const cropper = vi.hoisted(() => ({ area: { x: 0, y: 0, width: 1000, height: 600 }, emit: true }));
vi.mock('react-easy-crop', () => ({
  default: function Cropper({ onCropComplete, onMediaLoaded, aspect }) {
    useEffect(() => {
      onMediaLoaded?.({ naturalWidth: 2000 });
      if (cropper.emit) onCropComplete(null, cropper.area);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return <div data-testid="cropper" data-aspect={aspect} />;
  },
}));
vi.mock('./encode.js', () => ({ encodeCropped: vi.fn() }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container, root;
afterEach(() => {
  act(() => root?.unmount()); container?.remove(); container = root = null;
  cropper.area = { x: 0, y: 0, width: 1000, height: 600 }; cropper.emit = true;
  vi.unstubAllGlobals(); vi.clearAllMocks();
});

async function render(props = {}) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const p = { src: 'blob:x', background: '#123456', onApply: vi.fn(), onCancel: vi.fn(), ...props };
  await act(async () => root.render(<CropDialog {...p} />));
  return p;
}
const btn = (t) => [...container.querySelectorAll('button')].find((b) => b.textContent === t);
const radio = (t) => [...container.querySelectorAll('input[type=radio]')].find((r) => r.parentElement.textContent.trim() === t);
const status = () => container.querySelector('[role=status]');
async function pick(text) { await act(async () => radio(text).click()); }
const key = (k, opts = {}) => act(async () => {
  document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...opts }));
});

describe('CropDialog', () => {
  it('ist ein modaler Dialog mit Titel, 5:3 und Zoom-Regler 1-3', async () => {
    await render();
    const d = container.querySelector('[role=dialog]');
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(container.querySelector(`#${d.getAttribute('aria-labelledby')}`).textContent).toBe('Bild zuschneiden');
    expect(container.querySelector('[data-testid=cropper]').dataset.aspect).toBe(String(5 / 3));
    const zoom = container.querySelector('input[type=range]');
    expect(zoom.min).toBe('1');
    expect(zoom.max).toBe('3');
    expect(container.querySelector(`label[for=${zoom.id}]`).textContent).toBe('Zoom');
  });

  it('warnt im Modus Zuschneiden nur bei Ausschnitt unter 640 px', async () => {
    cropper.area = { x: 0, y: 0, width: 639, height: 383 };
    await render();
    expect(status().textContent).toBe('Bild wird unscharf wirken');
  });
  it('warnt nicht bei Ausschnitt ab 640 px', async () => {
    cropper.area = { x: 0, y: 0, width: 640, height: 384 };
    await render();
    expect(status()).toBeNull();
  });

  it('Modus Ganzes Bild: Hintergrundfarbe und Warnung nach Quellbreite', async () => {
    await render();
    await pick('Ganzes Bild zeigen');
    expect(container.querySelector('[data-testid=cropper]')).toBeNull();
    expect(container.querySelector('.crop-contain').style.background).toContain('rgb(18, 52, 86)');
    const img = container.querySelector('.crop-contain img');
    const load = (w) => act(async () => {
      Object.defineProperty(img, 'naturalWidth', { value: w, configurable: true });
      img.dispatchEvent(new Event('load'));
    });
    await load(639);
    expect(status().textContent).toBe('Bild wird unscharf wirken');
    await load(640);
    expect(status()).toBeNull();
    await pick('Zuschneiden');
    expect(container.querySelector('[data-testid=cropper]')).not.toBeNull();
  });

  it('Esc und Abbrechen schliessen', async () => {
    const p = await render();
    await key('Escape');
    expect(p.onCancel).toHaveBeenCalledTimes(1);
    await act(async () => btn('Abbrechen').click());
    expect(p.onCancel).toHaveBeenCalledTimes(2);
  });

  it('Fokus startet im Dialog und bleibt per Tab darin', async () => {
    await render();
    expect(document.activeElement).toBe(radio('Zuschneiden'));
    btn('Übernehmen').focus();
    await key('Tab');
    expect(document.activeElement).toBe(radio('Zuschneiden'));
    await key('Tab', { shiftKey: true });
    expect(document.activeElement).toBe(btn('Übernehmen'));
  });

  it('Übernehmen ist gesperrt, bis ein Ausschnitt vorliegt', async () => {
    cropper.emit = false;
    await render();
    expect(btn('Übernehmen').disabled).toBe(true);
    await pick('Ganzes Bild zeigen');
    expect(btn('Übernehmen').disabled).toBe(false);
  });

  it('Übernehmen liefert die kodierten Bytes', async () => {
    vi.stubGlobal('Image', class { set src(_) { queueMicrotask(() => this.onload()); } });
    encodeCropped.mockResolvedValue(new Blob([new Uint8Array([7, 8])], { type: 'image/webp' }));
    const p = await render();
    await act(async () => btn('Übernehmen').click());
    expect(encodeCropped).toHaveBeenCalledWith(expect.anything(), cropper.area, { mode: 'crop', background: '#123456' });
    expect([...p.onApply.mock.calls[0][0]]).toEqual([7, 8]);
  });

  it('zeigt Kodierfehler als Alert und uebernimmt nichts', async () => {
    vi.stubGlobal('Image', class { set src(_) { queueMicrotask(() => this.onload()); } });
    encodeCropped.mockRejectedValue(new Error('Kaputt.'));
    const p = await render();
    await act(async () => btn('Übernehmen').click());
    expect(container.querySelector('[role=alert]').textContent).toBe('Kaputt.');
    expect(p.onApply).not.toHaveBeenCalled();
  });
});
