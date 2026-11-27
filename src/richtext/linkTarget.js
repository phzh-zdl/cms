import { safeHttps } from './safeHttps.js';

// Gleiche Regeln wie checkHref in sanitize.js: https (ueber safeHttps), mailto:
// oder relativ ohne Schema. Liefert das Linkziel oder null, wenn es nicht erlaubt ist.
export function linkTarget(raw) {
  const h = String(raw || '').trim();
  if (safeHttps(h)) return safeHttps(h);
  if (/^mailto:/i.test(h)) return h;
  if (h && !/^[a-z][a-z0-9+.-]*:/i.test(h) && !h.startsWith('//')) return h;
  return null;
}
