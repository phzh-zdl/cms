import { describe, it, expect, beforeAll } from 'vitest';
import { CSP } from '../../scripts/csp.js';

let h;
beforeAll(async () => {
  await import('../../public/vorschau/handler.js');
  h = globalThis.zdlPreview;
});

const SCOPE = 'https://x.github.io/cms/vorschau/';
const fakeCache = (map) => ({ match: async (url) => map[url] });
const hit = () => new Response('<p>Hallo</p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

describe('SW-Handler', () => {
  it('Treffer: Inhalt mit CSP ohne api.github.com und no-store', async () => {
    const cache = fakeCache({ [`${SCOPE}r/index.html`]: hit() });
    const res = await h.respond(new Request(`${SCOPE}r/index.html`), SCOPE, cache);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('<p>Hallo</p>');
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const csp = res.headers.get('Content-Security-Policy');
    expect(csp).toBe("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'none'; object-src 'none'; frame-ancestors 'none'");
    expect(csp).not.toContain('github');
  });

  it('Ordner-Adresse liefert index.html, Query wird ignoriert', async () => {
    const cache = fakeCache({ [`${SCOPE}r/index.html`]: hit() });
    expect((await h.respond(new Request(`${SCOPE}r/`), SCOPE, cache)).status).toBe(200);
    expect((await h.respond(new Request(`${SCOPE}r/index.html?x=1`), SCOPE, cache)).status).toBe(200);
  });

  it('Fehltreffer: 404 mit deutschem Text und denselben Headern', async () => {
    const res = await h.respond(new Request(`${SCOPE}r/fehlt.js`), SCOPE, fakeCache({}));
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Diese Datei ist in der Vorschau nicht enthalten.');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('Content-Security-Policy')).toContain("connect-src 'self';");
  });

  it('ausserhalb des Scopes oder keine Lese-Anfrage: nicht behandelt', async () => {
    const cache = fakeCache({});
    expect(await h.respond(new Request('https://x.github.io/cms/index.html'), SCOPE, cache)).toBeNull();
    expect(await h.respond(new Request('https://x.github.io/cms/vorschau-x/a'), SCOPE, cache)).toBeNull();
    expect(await h.respond(new Request(`${SCOPE}r/a`, { method: 'POST', body: 'x' }), SCOPE, cache)).toBeNull();
    expect(h.inScope(`${SCOPE}r/a`, SCOPE)).toBe(true);
    expect(h.inScope('https://x.github.io/cms/a', SCOPE)).toBe(false);
  });

  it('Service Worker registrieren faellt unter default-src der CMS-CSP', () => {
    expect(CSP).toContain("default-src 'self'");
    expect(CSP).not.toContain('worker-src');
    expect(CSP).not.toContain('child-src');
  });
});
