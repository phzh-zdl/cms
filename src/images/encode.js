// Zuschneiden und als WebP kodieren (Breite max. 800 px, Format 5:3, Qualitaet 0.8).
export const MAX_WIDTH = 800;
export const QUALITY = 0.8;

export function targetSize(cropWidth) {
  const width = Math.min(MAX_WIDTH, Math.round(cropWidth));
  return { width, height: Math.round((width * 3) / 5) };
}

// image: ImageBitmap | HTMLImageElement; area = Ausschnitt in Bildpixeln (nur im Modus 'crop').
// 'contain': ganzes Bild, mittig und eingepasst auf einer Flaeche in background.
export function encodeCropped(image, area, { mode, background }) {
  const sourceWidth = image.naturalWidth ?? image.width;
  const sourceHeight = image.naturalHeight ?? image.height;
  const { width, height } = targetSize(mode === 'contain' ? sourceWidth : area.width);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (mode === 'contain') {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    const scale = Math.min(width / sourceWidth, height / sourceHeight);
    const w = sourceWidth * scale;
    const h = sourceHeight * scale;
    ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight, (width - w) / 2, (height - h) / 2, w, h);
  } else {
    ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, width, height);
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Das Bild konnte nicht umgewandelt werden.'))), 'image/webp', QUALITY);
  });
}
