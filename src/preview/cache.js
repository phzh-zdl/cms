// Cache Storage fuer die Vorschau: der Service Worker liefert daraus aus.
export const CACHE_NAME = 'zdl-vorschau';

// Alte Eintraege loeschen, Dateien ablegen; Rueckgabe = Adresse der Startseite.
// Adressen: <Basis>/vorschau/<Repo-Name>/<Pfad> (absolut, damit es auch unter /cms/ passt).
export async function fillPreviewCache(files, repoName, { cacheStorage = globalThis.caches, baseURI = document.baseURI } = {}) {
  await cacheStorage.delete(CACHE_NAME);
  const cache = await cacheStorage.open(CACHE_NAME);
  const urlOf = (path) => new URL(`./vorschau/${repoName}/${path}`, baseURI).href;
  for (const [path, { bytes, type }] of files) {
    await cache.put(urlOf(path), new Response(bytes, { headers: { 'Content-Type': type } }));
  }
  return urlOf('index.html');
}

export async function clearPreviewCache(cacheStorage = globalThis.caches) {
  if (!cacheStorage) return;
  try { await cacheStorage.delete(CACHE_NAME); } catch { /* nichts zu loeschen */ }
}
