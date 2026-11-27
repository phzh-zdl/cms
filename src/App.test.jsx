import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import App from './App.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./github/client.js', async (orig) => {
  const mod = await orig();
  return { ...mod, createClient: vi.fn(() => ({ getUser: async () => ({ login: 'anna', name: 'Anna Muster' }) })) };
});
import { createClient, AuthError } from './github/client.js';

let container;
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
afterEach(() => { container?.remove(); container = null; });

function render(ui) {
  container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return container;
}

describe('App', () => {
  it('renders the login screen when no token is stored', () => {
    const el = render(<App />);
    expect(el.querySelector('h1').textContent).toBe('OER-Inhalte bearbeiten');
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

  it('drops an invalid stored token and shows the login', async () => {
    localStorage.setItem('cms.token', 'stale');
    createClient.mockImplementationOnce(() => ({ getUser: async () => { throw new AuthError(401); } }));
    const el = render(<App />);
    await act(async () => {});
    expect(localStorage.getItem('cms.token')).toBeNull();
    expect(el.querySelector('input#token')).not.toBeNull();
  });
});
