// Kennung aus einem Namen ableiten: Kleinbuchstaben, Umlaute ausgeschrieben,
// alles ausser [a-z0-9] wird zu "-", hoechstens 32 Zeichen.
export const SLUG_MAX = 32;

export function deriveSlug(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '');
}
