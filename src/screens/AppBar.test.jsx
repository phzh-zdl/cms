import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import AppBar from './AppBar.jsx';

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

describe('AppBar', () => {
  it('zeigt Produkt, Seite, Anmeldung und Abmelden in einer Kopfzeile', () => {
    const onLogout = vi.fn();
    const c = render(<AppBar user={{ login: 'anna', name: 'Anna' }} siteName="OER-Katalog" onLogout={onLogout} />);
    const header = c.querySelector('header');
    expect(header.textContent).toContain('ZDL CMS');
    expect(header.textContent).toContain('OER-Katalog');
    expect(header.textContent).toContain('Angemeldet als Anna');
    const button = [...header.querySelectorAll('button')].find((b) => b.textContent === 'Abmelden');
    act(() => button.click());
    expect(onLogout).toHaveBeenCalled();
    expect(header.querySelector('h1')).toBeNull(); // die H1 gehört der Ansicht
  });

  it('lässt den Seitennamen weg, wenn keine Seite offen ist, und nutzt sonst den Login', () => {
    const c = render(<AppBar user={{ login: 'anna' }} siteName={null} onLogout={() => {}} />);
    expect(c.querySelector('.app-site')).toBeNull();
    expect(c.textContent).toContain('Angemeldet als anna');
  });

  it('verlinkt die Anleitung in einem neuen Fenster, damit ungespeicherte Arbeit bleibt', () => {
    const c = render(<AppBar user={{ login: 'anna' }} onLogout={() => {}} />);
    const link = c.querySelector('header a');
    expect(link.textContent).toBe('Anleitung (neues Fenster)');
    expect(link.getAttribute('href')).toBe('./anleitung.html');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });
});
