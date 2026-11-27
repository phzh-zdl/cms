import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import SiteEditor from './SiteEditor.jsx';
import { serializeJson } from '../save/serialize.js';
import {
  makeSite, contentFiles, repoClient, lastWrite, render, cleanup, type, button, click, nav,
} from './__fixtures__/settingsSite.jsx';

beforeEach(() => { localStorage.clear(); });
afterEach(cleanup);

const openCarousel = async (c) => click(nav(c, 'Karussell (Im Fokus)'));

describe('Einstellungen', () => {
  it('fehlende Datei: Formular mit Standardwerten, nicht ungespeichert', async () => {
    const c = await render(<SiteEditor site={makeSite()} client={repoClient()} onBack={() => {}} />);
    await openCarousel(c);
    expect(c.querySelector('#field-interval_seconds').value).toBe('7');
    expect(c.querySelector('#field-count').value).toBe('9');
    expect(c.querySelector('#field-fill').checked).toBe(true);
    expect(c.querySelector('#field-interval_seconds').getAttribute('min')).toBe('5');
    expect(c.querySelector('#field-interval_seconds').getAttribute('max')).toBe('20');
    expect(c.textContent).toContain('Alle Änderungen gespeichert.');
  });

  it('vorhandene Datei: deren Werte', async () => {
    const c = await render(<SiteEditor site={makeSite({ carousel: { interval_seconds: 12, count: 4, fill: false } })}
      client={repoClient()} onBack={() => {}} />);
    await openCarousel(c);
    expect(c.querySelector('#field-interval_seconds').value).toBe('12');
    expect(c.querySelector('#field-count').value).toBe('4');
    expect(c.querySelector('#field-fill').checked).toBe(false);
  });

  it.each([['4'], ['21']])('Wert %s: Fehlermeldung, Speichern blockiert', async (value) => {
    const client = repoClient();
    const c = await render(<SiteEditor site={makeSite()} client={client} onBack={() => {}} />);
    await openCarousel(c);
    await type(c.querySelector('#field-interval_seconds'), value);
    expect(c.textContent).toContain('Bitte einen Wert zwischen 5 und 20 eingeben.');
    expect(c.querySelector('#field-interval_seconds').getAttribute('aria-invalid')).toBe('true');
    expect(c.textContent).toContain('Ungespeicherte Änderungen');
    await click(button(c, 'Speichern'));
    const alert = c.querySelector('.save-bar [role="alert"]');
    expect(alert.textContent).toContain('Bitte zuerst die markierten Fehler beheben.');
    expect(alert.textContent).toContain('Karussell');
    expect(client.calls.filter((x) => x[0] === 'createCommit')).toHaveLength(0);
  });

  it('Kommazahl: ganze Zahl verlangt', async () => {
    const c = await render(<SiteEditor site={makeSite()} client={repoClient()} onBack={() => {}} />);
    await openCarousel(c);
    await type(c.querySelector('#field-count'), '7.5');
    expect(c.textContent).toContain('Bitte eine ganze Zahl eingeben.');
  });

  it('Speichern legt content/carousel.json mit genau drei Schluesseln an, boolean als false', async () => {
    const client = repoClient();
    const c = await render(<SiteEditor site={makeSite()} client={client} onBack={() => {}} />);
    await openCarousel(c);
    await click(c.querySelector('#field-fill'));
    expect(c.textContent).toContain('Ungespeicherte Änderungen');
    await click(button(c, 'Speichern'));
    expect(c.textContent).toContain('Gespeichert.');
    const written = lastWrite(client);
    expect(Object.keys(written)).toEqual(['content/carousel.json']);
    const saved = JSON.parse(written['content/carousel.json']);
    expect(saved).toEqual({ interval_seconds: 7, count: 9, fill: false });
    expect(Object.keys(saved)).toEqual(['interval_seconds', 'count', 'fill']);
    expect(written['content/carousel.json']).toBe(serializeJson(saved));
    expect(client.calls.find((x) => x[0] === 'createCommit')[2]).toBe('Einstellungen „Karussell“ geändert');
    expect(c.textContent).toContain('Alle Änderungen gespeichert.');
  });

  it('eigenständige Einstellung ohne Ansicht: Gruppe Einstellungen mit eigenem Formular', async () => {
    const c = await render(<SiteEditor site={makeSite({ views: [] })} client={repoClient()} onBack={() => {}} />);
    await click(nav(c, 'Karussell'));
    expect(c.querySelector('h1').textContent).toBe('Karussell');
    expect(c.querySelector('#field-count').value).toBe('9');
  });

  it('Entwurf enthält die Einstellung und stellt sie wieder her', async () => {
    const site = makeSite();
    const c = await render(<SiteEditor site={site} client={repoClient()} onBack={() => {}} />);
    await openCarousel(c);
    await type(c.querySelector('#field-count'), '12');
    cleanup();
    const draft = JSON.parse(localStorage.getItem('cms.draft.o/r'));
    expect(draft.settings.carousel).toEqual({ interval_seconds: 7, count: 12, fill: true });
    const c2 = await render(<SiteEditor site={site} client={repoClient()} onBack={() => {}} />);
    await click(button(c2, 'Wiederherstellen'));
    await openCarousel(c2);
    expect(c2.querySelector('#field-count').value).toBe('12');
    expect(c2.textContent).toContain('Ungespeicherte Änderungen');
  });
});

describe('Einstellungen: gleichzeitige Änderung', () => {
  const saved = { interval_seconds: 7, count: 9, fill: true };

  it('beide geändert: Konfliktdialog, Meine Version wird gespeichert', async () => {
    const client = repoClient({
      contents: { head1: contentFiles({ carousel: { ...saved, count: 15 } }) },
      otherHeads: ['head1'],
    });
    const c = await render(<SiteEditor site={makeSite({ carousel: saved })} client={client} onBack={() => {}} />);
    await openCarousel(c);
    await type(c.querySelector('#field-count'), '12');
    await click(button(c, 'Speichern'));
    const dlg = c.querySelector('[role="dialog"]');
    expect(dlg).not.toBeNull();
    expect(dlg.textContent).toContain('„Karussell“ in Einstellungen wurde inzwischen von jemand anderem geändert.');
    expect(dlg.textContent).toContain('Anzahl Karten: 15');
    expect(dlg.textContent).toContain('Anzahl Karten: 12');
    await click(button(c, 'Meine Version übernehmen'));
    expect(c.querySelector('[role="dialog"]')).toBeNull();
    expect(JSON.parse(lastWrite(client)['content/carousel.json'])).toEqual({ ...saved, count: 12 });
    expect(c.textContent).toContain('Gespeichert.');
  });

  it('nur die anderen geändert: kein Dialog, deren Fassung bleibt', async () => {
    const client = repoClient({
      contents: { head1: contentFiles({ carousel: { ...saved, count: 15 } }) },
      otherHeads: ['head1'],
    });
    const c = await render(<SiteEditor site={makeSite({ carousel: saved })} client={client} onBack={() => {}} />);
    await click(nav(c, 'Karussell (Im Fokus)'));
    await click(c.querySelector('[aria-label="„Alpha“ entfernen"]'));
    await click(button(c, 'Speichern'));
    expect(c.querySelector('[role="dialog"]')).toBeNull();
    expect(c.textContent).toContain('Gespeichert.');
    expect(c.querySelector('#field-count').value).toBe('15');
  });
});
