import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import Login from './Login.jsx';
import { AuthError, GitHubError } from '../github/client.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container, root;
afterEach(() => { act(() => root?.unmount()); container?.remove(); container = root = null; });

function render(ui) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(ui));
  return container;
}

function type(input, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function submit(el) {
  await act(async () => {
    el.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

const user = { login: 'anna', name: 'Anna Muster' };

describe('Login', () => {
  it('has a password field, a labelled remember checkbox and a linked hint', () => {
    const el = render(<Login onLogin={() => {}} />);
    const input = el.querySelector('input#token');
    expect(input.type).toBe('password');
    expect(input.getAttribute('autocomplete')).toBe('off');
    const box = el.querySelector('input[type="checkbox"]');
    expect(el.querySelector(`label[for="${box.id}"]`).textContent).toBe('Auf diesem Gerät merken');
    const hint = el.querySelector(`#${box.getAttribute('aria-describedby')}`);
    expect(hint.textContent).toBe('Nur auf persönlichen Geräten');
  });

  it('shows a field error for an empty token without calling the client', async () => {
    const createClientImpl = vi.fn();
    const el = render(<Login onLogin={() => {}} createClientImpl={createClientImpl} />);
    type(el.querySelector('#token'), '   ');
    await submit(el);
    expect(el.querySelector('[role="alert"]').textContent).toBe('Bitte einen Zugangsschlüssel eingeben.');
    expect(createClientImpl).not.toHaveBeenCalled();
  });

  it('shows the invalid-token message and a help link on AuthError', async () => {
    const createClientImpl = () => ({ getUser: async () => { throw new AuthError(401); } });
    const onLogin = vi.fn();
    const el = render(<Login onLogin={onLogin} createClientImpl={createClientImpl} />);
    type(el.querySelector('#token'), 'bad');
    await submit(el);
    const alert = el.querySelector('[role="alert"]');
    expect(alert.textContent).toContain('Dieser Zugangsschlüssel ist ungültig oder abgelaufen.');
    const link = alert.querySelector('a');
    expect(link.textContent).toBe('Anleitung: Zugangsschlüssel erstellen');
    expect(link.getAttribute('href')).toBe('./anleitung.html#zugangsschluessel');
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('shows the message of other GitHubErrors', async () => {
    const createClientImpl = () => ({ getUser: async () => { throw new GitHubError(0, 'Keine Verbindung.'); } });
    const el = render(<Login onLogin={() => {}} createClientImpl={createClientImpl} />);
    type(el.querySelector('#token'), 'tok');
    await submit(el);
    expect(el.querySelector('[role="alert"]').textContent).toBe('Keine Verbindung.');
  });

  it('calls onLogin with trimmed token, user and remember flag', async () => {
    const createClientImpl = vi.fn(() => ({ getUser: async () => user }));
    const onLogin = vi.fn();
    const el = render(<Login onLogin={onLogin} createClientImpl={createClientImpl} />);
    type(el.querySelector('#token'), '  tok123  ');
    act(() => { el.querySelector('input[type="checkbox"]').click(); });
    await submit(el);
    expect(createClientImpl).toHaveBeenCalledWith('tok123');
    expect(onLogin).toHaveBeenCalledWith({ token: 'tok123', user, remember: true });
  });

  it('disables the button and shows "Prüfe …" while checking', async () => {
    let resolve;
    const createClientImpl = () => ({ getUser: () => new Promise((r) => { resolve = r; }) });
    const el = render(<Login onLogin={() => {}} createClientImpl={createClientImpl} />);
    type(el.querySelector('#token'), 'tok');
    await submit(el);
    const button = el.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe('Prüfe …');
    await act(async () => { resolve(user); });
  });
});
