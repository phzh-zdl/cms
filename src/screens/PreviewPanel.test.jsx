import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

vi.mock('../preview/files.js', () => ({
  buildPreviewFiles: vi.fn(async (c, r, cfg, w, { onProgress }) => {
    onProgress({ done: 12, total: 40 });
    return new Map([['index.html', { bytes: new Uint8Array(), type: 'text/html' }]]);
  }),
}));
vi.mock('../preview/cache.js', () => ({
  fillPreviewCache: vi.fn(async () => 'https://h/cms/vorschau/r/index.html'),
  beginPreviewRun: vi.fn(() => 1),
}));
import PreviewPanel from './PreviewPanel.jsx';
import { buildPreviewFiles } from '../preview/files.js';
import { fillPreviewCache } from '../preview/cache.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container, root;
afterEach(() => { act(() => root?.unmount()); container?.remove(); container = root = null; vi.unstubAllGlobals(); vi.restoreAllMocks(); });
beforeEach(() => vi.clearAllMocks());
async function render(ui) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(ui));
}
const site = { repo: 'o/r', config: {} };
const getWork = () => ({ headSha: 'h', dirty: true, data: {}, pages: {}, newImages: [] });
const fakeSw = () => ({ register: vi.fn(async () => ({ active: { state: 'activated' } })) });

describe('PreviewPanel', () => {
  it('ohne Service Worker: feste Meldung als alert', async () => {
    vi.stubGlobal('navigator', {});
    await render(<PreviewPanel site={site} client={{}} getWork={getWork} />);
    expect(container.querySelector('[role="alert"]').textContent)
      .toBe('Die Vorschau ist in diesem Browser nicht verfügbar. Bitte exportieren und das ZIP ansehen.');
    expect(buildPreviewFiles).not.toHaveBeenCalled();
  });

  it('registriert den Worker mit Scope, oeffnet noopener; Link bleibt sichtbar (auch bei null)', async () => {
    const sw = fakeSw();
    vi.stubGlobal('navigator', { serviceWorker: sw });
    vi.stubGlobal('caches', {});
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    await render(<PreviewPanel site={site} client={{}} getWork={getWork} />);
    expect(sw.register).toHaveBeenCalledWith('./vorschau/sw.js', { scope: './vorschau/' });
    expect(open).toHaveBeenCalledWith('https://h/cms/vorschau/r/index.html', '_blank', 'noopener');
    const link = container.querySelector('a');
    expect(link.textContent).toBe('Vorschau öffnen');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('href')).toBe('https://h/cms/vorschau/r/index.html');
  });

  it('Fehler als alert, aria-live vorhanden', async () => {
    vi.stubGlobal('navigator', { serviceWorker: fakeSw() });
    vi.stubGlobal('caches', {});
    buildPreviewFiles.mockImplementationOnce(async () => { throw new Error('kaputt'); });
    await render(<PreviewPanel site={site} client={{}} getWork={getWork} />);
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
    expect(container.querySelector('[role="alert"]').textContent).toContain('kaputt');
    expect(container.querySelector('a')).toBeNull();
  });

  it('zeigt Fortschrittstext', async () => {
    let release;
    buildPreviewFiles.mockImplementationOnce((c, r, cfg, w, { onProgress }) => new Promise((res) => {
      onProgress({ done: 12, total: 40 }); release = () => res(new Map());
    }));
    vi.stubGlobal('navigator', { serviceWorker: fakeSw() });
    vi.stubGlobal('caches', {});
    vi.spyOn(window, 'open').mockReturnValue(null);
    await render(<PreviewPanel site={site} client={{}} getWork={getWork} />);
    expect(container.querySelector('[aria-live="polite"]').textContent).toBe('Vorschau wird vorbereitet … 12 von 40');
    await act(async () => release());
  });

  it('ueberholter Lauf (fill liefert null): kein Oeffnen, kein Link', async () => {
    vi.stubGlobal('navigator', { serviceWorker: fakeSw() });
    vi.stubGlobal('caches', {});
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    fillPreviewCache.mockResolvedValueOnce(null);
    await render(<PreviewPanel site={site} client={{}} getWork={getWork} />);
    expect(open).not.toHaveBeenCalled();
    expect(container.querySelector('a')).toBeNull();
  });

  it('meldet Beschaeftigt an den Aufrufer', async () => {
    let release;
    buildPreviewFiles.mockImplementationOnce(() => new Promise((res) => { release = () => res(new Map()); }));
    vi.stubGlobal('navigator', { serviceWorker: fakeSw() });
    vi.stubGlobal('caches', {});
    vi.spyOn(window, 'open').mockReturnValue(null);
    const calls = [];
    await render(<PreviewPanel site={site} client={{}} getWork={getWork} onBusyChange={(b) => calls.push(b)} />);
    expect(calls.at(-1)).toBe(true);
    await act(async () => release());
    expect(calls.at(-1)).toBe(false);
  });
});
