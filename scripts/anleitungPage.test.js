import { describe, it, expect } from 'vitest';
import { renderAnleitung } from './anleitungPage.js';
import { CSP } from './csp.js';

const escapeForAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

describe('renderAnleitung', () => {
  const md = '# Anleitung\n\nText.\n\n<a id="zugangsschluessel"></a>\n## Zugangsschlüssel\n\n1. Eins\n';
  const html = renderAnleitung(md);

  it('liefert eine vollständige deutsche Seite', () => {
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain('<html lang="de">');
    expect(html).toContain('<meta name="viewport"');
    expect(html).toContain('<title>Anleitung</title>');
  });

  it('behält den Anker für den Link im Login', () => {
    expect(html).toContain('id="zugangsschluessel"');
  });

  it('rendert Markdown zu HTML', () => {
    expect(html).toContain('<h2>Zugangsschlüssel</h2>');
    expect(html).toContain('<ol>');
  });

  it('lädt nichts Externes und enthält keine Skripte', () => {
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/(src|href)="https?:/i);
  });

  it('hat einen Titel auch ohne Überschrift', () => {
    expect(renderAnleitung('nur Text')).toContain('<title>Anleitung</title>');
  });

  it('entfernt Bild-Platzhalter nicht, verweist aber relativ', () => {
    const out = renderAnleitung('![Screenshot: Anmeldung](bilder/anmeldung.png)');
    expect(out).toContain('src="bilder/anmeldung.png"');
    expect(out).toContain('alt="Screenshot: Anmeldung"');
  });

  it('enthält dieselbe CSP wie das CMS', () => {
    expect(html).toContain('http-equiv="Content-Security-Policy"');
    expect(html).toContain(escapeForAttr(CSP));
  });

  it('gibt rohes HTML als Text aus, nicht als Tags', () => {
    const out = renderAnleitung('<script>alert(1)</script>\n\nText <img src=x onerror=alert(1)> Ende\n');
    expect(out).not.toMatch(/<script>alert/i);
    expect(out).not.toMatch(/<img src=x/i);
    expect(out).toContain('&lt;script&gt;');
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('erlaubt nur Sprungmarken als rohes HTML', () => {
    expect(renderAnleitung('<a id="x"></a>\n\n## T\n')).toContain('<a id="x"></a>');
    expect(renderAnleitung('<a href="javascript:alert(1)">k</a>')).not.toMatch(/<a href="javascript/);
  });
});
