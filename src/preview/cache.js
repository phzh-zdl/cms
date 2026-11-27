// Cache Storage fuer die Vorschau: der Service Worker liefert daraus aus.
export const CACHE_NAME = 'zdl-vorschau';

// Laufnummer: nur der neueste Lauf darf den Cache beschreiben. Abmelden (clearPreviewCache) zaehlt
// ebenfalls hoch, damit ein noch laufender Lauf den Cache nicht neu anlegt.
let current = 0;
let cleared = false;
export const beginPreviewRun = () => { cleared = false; return ++current; };

// Alte Eintraege loeschen, Dateien ablegen; Rueckgabe = Adresse der Startseite,
// oder null, wenn der Lauf inzwischen ueberholt wurde (dann bleibt der Cache unveraendert bzw. leer).
// Adressen: <Basis>/vorschau/<Repo-Name>/<Pfad> (absolut, damit es auch unter /cms/ passt).
export async function fillPreviewCache(files, repoName, { gen = beginPreviewRun(), cacheStorage = globalThis.caches, baseURI = document.baseURI } = {}) {
  const stale = () => gen !== current;
  if (stale()) return null;
  await cacheStorage.delete(CACHE_NAME);
  if (stale()) return null;
  const cache = await cacheStorage.open(CACHE_NAME);
  const urlOf = (path) => new URL(`./vorschau/${repoName}/${path}`, baseURI).href;
  for (const [path, { bytes, type }] of files) {
    if (stale()) break;
    await cache.put(urlOf(path), new Response(bytes, { headers: { 'Content-Type': type } }));
  }
  if (stale()) {
    if (cleared) await cacheStorage.delete(CACHE_NAME); // Abmelden dazwischen: nichts zuruecklassen
    return null;
  }
  return urlOf('index.html');
}

export async function clearPreviewCache(cacheStorage = globalThis.caches) {
  current++;
  cleared = true;
  if (!cacheStorage) return;
  try { await cacheStorage.delete(CACHE_NAME); } catch { /* nichts zu loeschen */ }
}
