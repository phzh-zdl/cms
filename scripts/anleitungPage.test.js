import { describe, it, expect } from 'vitest';
import { renderAnleitung } from './anleitungPage.js';

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
});
