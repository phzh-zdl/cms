// Entwuerfe im localStorage: cms.draft.<repo>.
// state = { savedAt, baseSha, data, pages, removedFiles, newImages: [{ path, base64 }] }
const keyFor = (repo) => `cms.draft.${repo}`;

// true = gesichert; false = ging nicht (z. B. Speicher voll) - Arbeiten geht trotzdem weiter.
export function saveDraft(repo, state) {
  try {
    localStorage.setItem(keyFor(repo), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function loadDraft(repo) {
  try {
    const raw = localStorage.getItem(keyFor(repo));
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object' || typeof d.savedAt !== 'string' || !d.data || typeof d.data !== 'object') return null;
    return {
      savedAt: d.savedAt,
      baseSha: d.baseSha ?? null,
      data: d.data,
      pages: d.pages ?? {},
      removedFiles: Array.isArray(d.removedFiles) ? d.removedFiles : [],
      newImages: Array.isArray(d.newImages) ? d.newImages : [],
    };
  } catch {
    return null;
  }
}

export function clearDraft(repo) {
  try {
    localStorage.removeItem(keyFor(repo));
  } catch { /* nichts zu tun */ }
}

function bytesToBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export const imagesToDraft = (images) => images.map(({ path, bytes }) => ({ path, base64: bytesToBase64(bytes) }));
export const imagesFromDraft = (images) => images.map(({ path, base64 }) => ({ path, bytes: base64ToBytes(base64) }));
