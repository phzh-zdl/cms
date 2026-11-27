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
    expect(html).toContain('<title>Anleitung – ZDL CMS</title>');
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
    expect(renderAnleitung('nur Text')).toContain('<title>Anleitung – ZDL CMS</title>');
  });

  it('zeigt vorhandene Bilder relativ, mit Alt-Text und loading="lazy"', () => {
    const out = renderAnleitung('![Screenshot: Anmeldung](bilder/anmeldung.png)', { imageExists: () => true });
    expect(out).toContain('src="bilder/anmeldung.png"');
    expect(out).toContain('alt="Screenshot: Anmeldung"');
    expect(out).toContain('loading="lazy"');
    expect(out).not.toContain('bild-folgt"><span>');
  });

  it('zeigt für fehlende Bilder einen ruhigen Platzhalter statt eines kaputten Bildes', () => {
    const seen = [];
    const out = renderAnleitung('![Screenshot: <Anmeldung> & "Co"](bilder/fehlt.png)',
      { imageExists: (name) => { seen.push(name); return false; } });
    expect(seen).toEqual(['fehlt.png']);
    expect(out).not.toMatch(/<img/i);
    expect(out).toContain('<figure class="bild-folgt"><span>Bild folgt: Screenshot: &lt;Anmeldung&gt; &amp; &quot;Co&quot;</span></figure>');
  });

  it('prüft ohne Angabe die Dateien in docs/bilder (dort liegen noch keine Screenshots)', () => {
    const out = renderAnleitung('![Screenshot: Anmeldung](bilder/gibt-es-nicht.png)');
    expect(out).toContain('Bild folgt: Screenshot: Anmeldung');
    expect(out).not.toMatch(/<img/i);
  });

  it('zeigt Bilder ausserhalb von bilder/ nie als Bild', () => {
    for (const src of ['https://example.org/x.png', '../geheim.png', 'bilder/../x.png']) {
      const out = renderAnleitung(`![A](${src})`, { imageExists: () => true });
      expect(out, src).not.toMatch(/<img/i);
      expect(out, src).toContain('Bild folgt: A');
    }
  });

  it('gestaltet den Platzhalter in der Seite', () => {
    expect(html).toMatch(/\.bild-folgt\s*\{[^}]*dashed/);
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

  it('rendert nur sichere Links als Link', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'vbscript:x', 'http://phzh.ch', 'JaVaScript:alert(1)']) {
      const out = renderAnleitung('[l](' + bad + ')');
      expect(out, bad).not.toMatch(/<a [^>]*href/i);
      expect(out, bad).toContain('l');
    }
    expect(renderAnleitung('[l](https://phzh.ch)')).toContain('<a href="https://phzh.ch">l</a>');
    expect(renderAnleitung('[l](#zugangsschluessel)')).toContain('<a href="#zugangsschluessel">l</a>');
    expect(renderAnleitung('[l](./x.html)')).toContain('href="./x.html"');
    expect(renderAnleitung('[l](mailto:a@b.ch)')).toContain('href="mailto:a@b.ch"');
  });
});
