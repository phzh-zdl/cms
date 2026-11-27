import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import App from './App.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./github/client.js', async (orig) => {
  const mod = await orig();
  return { ...mod, createClient: vi.fn(() => ({ getUser: async () => ({ login: 'anna', name: 'Anna Muster' }) })) };
});
import { createClient, AuthError, GitHubError } from './github/client.js';

let container, root;
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
afterEach(() => { act(() => root?.unmount()); container?.remove(); container = root = null; });

function render(ui) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(ui));
  return container;
}

describe('App', () => {
  it('renders the login screen when no token is stored', () => {
    const el = render(<App />);
    expect(el.querySelector('h1').textContent).toBe('ZDL CMS');
    const input = el.querySelector('input#token');
    expect(input).not.toBeNull();
    expect(el.querySelector(`label[for="${input.id}"]`).textContent).toBe('Zugangsschlüssel');
  });

  it('verifies a stored token, shows the user and logs out', async () => {
    sessionStorage.setItem('cms.token', 'stored');
    const el = render(<App />);
    expect(el.textContent).toContain('Anmeldung wird geprüft …');
    await act(async () => {});
    expect(el.textContent).toContain('Angemeldet als Anna Muster');
    await act(async () => {
      [...el.querySelectorAll('button')].find((b) => b.textContent === 'Abmelden').click();
    });
    expect(sessionStorage.getItem('cms.token')).toBeNull();
    expect(el.querySelector('input#token')).not.toBeNull();
  });

  it('logout deletes the preview cache', async () => {
    sessionStorage.setItem('cms.token', 'stored');
    const del = vi.fn(async () => true);
    vi.stubGlobal('caches', { delete: del });
    const el = render(<App />);
    await act(async () => {});
    await act(async () => {
      [...el.querySelectorAll('button')].find((b) => b.textContent === 'Abmelden').click();
    });
    expect(del).toHaveBeenCalledWith('zdl-vorschau');
    vi.unstubAllGlobals();
  });

  it('drops an invalid stored token and shows the login', async () => {
    localStorage.setItem('cms.token', 'stale');
    createClient.mockImplementationOnce(() => ({ getUser: async () => { throw new AuthError(401); } }));
    const el = render(<App />);
    await act(async () => {});
    expect(localStorage.getItem('cms.token')).toBeNull();
    expect(el.querySelector('input#token')).not.toBeNull();
  });

  it('keeps the stored token when GitHub is unreachable', async () => {
    localStorage.setItem('cms.token', 'keep');
    createClient.mockImplementationOnce(() => ({ getUser: async () => { throw new GitHubError(0, 'Keine Verbindung.'); } }));
    const el = render(<App />);
    await act(async () => {});
    expect(localStorage.getItem('cms.token')).toBe('keep');
    expect(el.querySelector('[role="alert"]').textContent).toContain('Keine Verbindung.');
    expect([...el.querySelectorAll('button')].some((b) => b.textContent === 'Erneut versuchen')).toBe(true);
  });

  it('retry succeeds after a network error', async () => {
    sessionStorage.setItem('cms.token', 'keep');
    createClient.mockImplementationOnce(() => ({ getUser: async () => { throw new GitHubError(0, 'Keine Verbindung.'); } }));
    const el = render(<App />);
    await act(async () => {});
    await act(async () => {
      [...el.querySelectorAll('button')].find((b) => b.textContent === 'Erneut versuchen').click();
    });
    expect(el.textContent).toContain('Angemeldet als Anna Muster');
  });
});
