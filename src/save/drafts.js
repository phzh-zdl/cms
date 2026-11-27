// Entwuerfe im localStorage: cms.draft.<repo>.
// state = { savedAt, baseSha, ancestor, data, pages, removedFiles, newImages: [{ path, base64 }] }
// ancestor: siehe useSiteWorkingCopy (Vergleichsbasis fuer waehrend des Speicherns bearbeitete Dateien).
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
      ancestor: d.ancestor && typeof d.ancestor === 'object' ? d.ancestor : null,
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

// Nach erfolgreichem Speichern, wenn der Editor nicht mehr offen ist: Ein Entwurf, der genau
// dem Gespeicherten entspricht, ist erledigt; enthaelt er neuere Aenderungen, bleibt er und
// baut nun auf der neuen Version auf. Entwuerfe auf einer anderen Basis bleiben unberuehrt.
export function settleDraftAfterSave(repo, snapshot, oldSha, newSha) {
  const draft = loadDraft(repo);
  if (!draft || draft.baseSha !== oldSha) return;
  const content = (s) => JSON.stringify([s.data, s.pages, s.removedFiles, s.newImages]);
  const saved = { ...snapshot, newImages: imagesToDraft(snapshot.newImages) };
  if (content(draft) === content(saved)) clearDraft(repo);
  else saveDraft(repo, { ...draft, baseSha: newSha });
}
