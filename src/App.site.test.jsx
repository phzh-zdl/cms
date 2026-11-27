import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import App from './App.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./github/client.js', async (orig) => {
  const mod = await orig();
  return { ...mod, createClient: vi.fn(() => ({ getUser: async () => ({ login: 'anna', name: 'Anna' }) })) };
});
vi.mock('./content/site.js', () => ({
  listSites: vi.fn(async () => []),
  loadSite: vi.fn(),
}));
import { loadSite } from './content/site.js';

let container, root;
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); window.location.hash = ''; loadSite.mockReset(); });
afterEach(() => { act(() => root?.unmount()); container?.remove(); container = root = null; window.location.hash = ''; });

function render(ui) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(ui));
  return container;
}

describe('App site opening', () => {
  it('ignores an invalid hash and shows the list without loading', async () => {
    window.location.hash = '#/other/repo';
    sessionStorage.setItem('cms.token', 't');
    const el = render(<App />);
    await act(async () => {});
    expect(loadSite).not.toHaveBeenCalled();
    expect(el.querySelector('h1').textContent).toBe('Seite wählen');
  });

  it('opens a valid hash directly', async () => {
    window.location.hash = '#/phzh-zdl/oer';
    loadSite.mockResolvedValue({ repo: 'phzh-zdl/oer', config: { name: 'X', collections: [], pages: [] }, data: {}, pages: {} });
    sessionStorage.setItem('cms.token', 't');
    render(<App />);
    await act(async () => {});
    expect(loadSite).toHaveBeenCalledWith(expect.anything(), 'phzh-zdl/oer');
  });

  it('discards a load that finishes after logout', async () => {
    window.location.hash = '#/phzh-zdl/oer';
    let resolve;
    loadSite.mockReturnValue(new Promise((r) => { resolve = r; }));
    sessionStorage.setItem('cms.token', 't');
    const el = render(<App />);
    await act(async () => {});
    expect(el.textContent).toContain('Seite wird geladen …');
    await act(async () => {
      [...el.querySelectorAll('button')].find((b) => b.textContent === 'Abmelden').click();
    });
    await act(async () => {
      resolve({ repo: 'phzh-zdl/oer', config: { name: 'Geheim', collections: [], pages: [] }, data: {}, pages: {} });
    });
    expect(el.querySelector('input#token')).not.toBeNull();
    expect(el.textContent).not.toContain('Geheim');
    // erneut anmelden (hier bleibt der Hash leer): Seitenliste, nicht der alte Editor
    window.location.hash = '';
    const input = el.querySelector('input#token');
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'neu');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      el.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(el.querySelector('h1').textContent).toBe('Seite wählen');
    expect(el.textContent).not.toContain('Geheim');
  });
});
