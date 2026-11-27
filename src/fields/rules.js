// Reine Pruefregeln, identisch zum Validator des Katalogs.
export const SLUG_RE = /^[a-z0-9_-]{1,32}$/;
export const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export const length = (s) => [...String(s)].length;
export const isBlank = (v) => v == null || (typeof v === 'string' && v.trim() === '');

export const REQUIRED = 'Pflichtfeld.';

export function maxLengthError(value, field) {
  if (field.maxLength == null) return null;
  const n = length(value);
  return n > field.maxLength ? `Höchstens ${field.maxLength} Zeichen (aktuell ${n}).` : null;
}

// Pflicht + Leerwert: liefert undefined, wenn weitergeprueft werden soll.
export function requiredCheck(value, field) {
  if (isBlank(value)) return field.required ? REQUIRED : null;
  return undefined;
}

// Verweis auf einen Eintrag, den es (nicht mehr) gibt - z. B. inzwischen von jemand anderem geloescht.
export const MISSING_TARGET = 'Der gewählte Eintrag existiert nicht mehr. Bitte neu wählen.';
export const targetHas = (ctx, to, id) => (ctx.data?.[to] ?? []).some((r) => r.id === id);
