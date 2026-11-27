import { describe, it, expect, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import App from './App.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
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
});
