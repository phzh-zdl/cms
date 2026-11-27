import { describe, it, expect, vi, afterEach } from 'vitest';
import { targetSize, encodeCropped } from './encode.js';

describe('targetSize', () => {
  it('begrenzt die Breite auf 800 und haelt 5:3', () => {
    expect(targetSize(2400, 1440)).toEqual({ width: 800, height: 480 });
    expect(targetSize(500, 300)).toEqual({ width: 500, height: 300 });
  });
});

describe('encodeCropped', () => {
  afterEach(() => vi.restoreAllMocks());
  function fakeCanvas() {
    const ctx = { fillStyle: null, fillRect: vi.fn(), drawImage: vi.fn() };
    const canvas = {
      width: 0, height: 0, ctx,
      getContext: () => ctx,
      toBlob: vi.fn((cb) => cb(new Blob(['x'], { type: 'image/webp' }))),
    };
    vi.spyOn(document, 'createElement').mockImplementation(() => canvas);
    return canvas;
  }
  const image = { width: 3000, height: 1000 };

  it('crop: zeichnet den Ausschnitt, Canvas aus targetSize, WebP 0.8', async () => {
    const canvas = fakeCanvas();
    const blob = await encodeCropped(image, { x: 10, y: 20, width: 2400, height: 1440 }, { mode: 'crop', background: '#112233' });
    expect(blob).toBeInstanceOf(Blob);
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(480);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.8);
    expect(canvas.ctx.drawImage).toHaveBeenCalledWith(image, 10, 20, 2400, 1440, 0, 0, 800, 480);
  });

  it('contain: fuellt mit der Hintergrundfarbe und zentriert das Bild', async () => {
    const canvas = fakeCanvas();
    await encodeCropped(image, { x: 0, y: 0, width: 3000, height: 1000 }, { mode: 'contain', background: '#112233' });
    // Breite 800 (Quellbreite max 800), Hoehe 480; Bild 3:1 -> 800 x 266.67, mittig
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(480);
    expect(canvas.ctx.fillStyle).toBe('#112233');
    expect(canvas.ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 480);
    const args = canvas.ctx.drawImage.mock.calls[0];
    expect(args[0]).toBe(image);
    expect(args[1]).toBe(0);
    expect(args[2]).toBe(0);
    expect(args[3]).toBe(3000);
    expect(args[4]).toBe(1000);
    expect(args[5]).toBeCloseTo(0);
    expect(args[6]).toBeCloseTo((480 - 800 / 3) / 2);
    expect(args[7]).toBeCloseTo(800);
    expect(args[8]).toBeCloseTo(800 / 3);
  });

  it('wirft eine deutsche Meldung, wenn das Bild nicht kodiert werden kann', async () => {
    const canvas = fakeCanvas();
    canvas.toBlob = vi.fn((cb) => cb(null));
    await expect(encodeCropped(image, { x: 0, y: 0, width: 600, height: 360 }, { mode: 'crop', background: '#fff' }))
      .rejects.toThrow('Das Bild konnte nicht umgewandelt werden.');
  });

  it('lehnt Nicht-WebP-Ausgabe (Browser ohne WebP-Encoder) ab', async () => {
    const canvas = fakeCanvas();
    canvas.toBlob = vi.fn((cb) => cb(new Blob(['x'], { type: 'image/png' })));
    await expect(encodeCropped(image, { x: 0, y: 0, width: 600, height: 360 }, { mode: 'crop', background: '#fff' }))
      .rejects.toThrow('Dieser Browser kann keine WebP-Bilder erzeugen. Bitte einen aktuellen Browser verwenden (z.B. Chrome, Edge, Firefox oder Safari ab Version 16).');
  });
});
