import { describe, it, expect } from 'vitest';
import { fillPreviewCache, clearPreviewCache, CACHE_NAME } from './cache.js';

function fakeCaches() {
  const stores = new Map();
  return {
    stores,
    async delete(n) { return stores.delete(n); },
    async open(n) {
      if (!stores.has(n)) stores.set(n, new Map());
      const s = stores.get(n);
      return { put: async (url, res) => { s.set(url, res); }, match: async (u) => s.get(u) };
    },
  };
}

describe('Vorschau-Cache', () => {
  it('leert alte Eintraege, legt Dateien unter ./vorschau/<repo>/ ab', async () => {
    const caches = fakeCaches();
    await caches.open(CACHE_NAME);
    caches.stores.get(CACHE_NAME).set('alt', 1);
    const files = new Map([['index.html', { bytes: new TextEncoder().encode('hi'), type: 'text/html; charset=utf-8' }]]);
    const url = await fillPreviewCache(files, 'oer-dashboard', { cacheStorage: caches, baseURI: 'https://x.github.io/cms/' });
    expect(url).toBe('https://x.github.io/cms/vorschau/oer-dashboard/index.html');
    const store = caches.stores.get(CACHE_NAME);
    expect(store.has('alt')).toBe(false);
    const res = store.get(url);
    expect(await res.text()).toBe('hi');
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
  });
  it('clearPreviewCache loescht den Cache; ohne caches kein Fehler', async () => {
    const caches = fakeCaches();
    await caches.open(CACHE_NAME);
    await clearPreviewCache(caches);
    expect(caches.stores.has(CACHE_NAME)).toBe(false);
    await expect(clearPreviewCache(undefined)).resolves.toBeUndefined();
  });
});
