// Bildtyp an den ersten Bytes erkennen (nie am Dateinamen). SVG wird nie akzeptiert.
const startsWith = (bytes, sig, offset = 0) => sig.every((v, i) => bytes[offset + i] === v);
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));

export function detectImageType(bytes) {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return 'png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) return 'webp';
  if (startsWith(bytes, ascii('GIF8'))) return 'gif';
  return null;
}
