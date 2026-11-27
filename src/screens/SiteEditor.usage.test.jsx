import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import SiteEditor from './SiteEditor.jsx';
import {
  makeSite, repoClient, render, cleanup, select, button, named, click, nav, openEntry,
} from './__fixtures__/settingsSite.jsx';

beforeEach(() => { localStorage.clear(); });
afterEach(cleanup);

async function start(site = makeSite()) {
  const c = await render(<SiteEditor site={site} client={repoClient()} onBack={() => {}} />);
  return c;
}
const usage = (c) => [...c.querySelectorAll('.usage')].map((s) => ({
  heading: s.querySelector('h2').textContent,
  rows: [...s.querySelectorAll('li .pick-title')].map((el) => el.textContent),
  empty: s.querySelector('p')?.textContent ?? null,
}));

describe('Verwendet von', () => {
  it('Fachbereich: Zahl und Liste der Ressourcen', async () => {
    const c = await start();
    await click(nav(c, 'Fachbereiche'));
    await openEntry(c, 'Natur');
    expect(usage(c)).toEqual([{ heading: 'Verwendet von 2 Ressourcen', rows: ['Alpha', 'Gamma'], empty: null }]);
  });

  it('ungespeicherte Zuordnung zählt', async () => {
    const c = await start();
    await openEntry(c, 'Beta');
    await select(c.querySelector('#field-category_id'), 'natur');
    await click(nav(c, 'Fachbereiche'));
    await openEntry(c, 'Natur');
    expect(usage(c)[0].heading).toBe('Verwendet von 3 Ressourcen');
    expect(usage(c)[0].rows).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('reference-multi und mehrere verweisende Sammlungen', async () => {
    const c = await start(makeSite({ events: true }));
    await click(nav(c, 'Zielstufen'));
    await openEntry(c, 'Sekundarstufe');
    expect(usage(c)).toEqual([
      { heading: 'Verwendet von 1 Ressourcen', rows: ['Alpha'], empty: null },
      { heading: 'Verwendet von 1 Anlässe', rows: ['Tagung'], empty: null },
    ]);
  });

  it('keine Verwendung: Hinweis', async () => {
    const c = await start();
    await click(nav(c, 'Zielstufen'));
    await openEntry(c, 'Primarstufe');
    expect(usage(c)).toEqual([{ heading: 'Verwendet von 0 Ressourcen', rows: [], empty: 'Wird von keiner Ressourcen verwendet.' }]);
  });

  it('neuer Eintrag: kein Abschnitt; Sammlung ohne Verweise: kein Abschnitt', async () => {
    const c = await start();
    await click(nav(c, 'Fachbereiche'));
    await click(button(c, 'Neu'));
    expect(c.querySelector('.usage')).toBeNull();
    await click(nav(c, 'Ressourcen'));
    await openEntry(c, 'Alpha');
    expect(c.querySelector('.usage')).toBeNull();
  });

  it('Öffnen führt zum Eintrag, ungespeicherte Änderungen bleiben', async () => {
    const c = await start();
    await openEntry(c, 'Beta');
    await select(c.querySelector('#field-category_id'), 'natur');
    await click(nav(c, 'Fachbereiche'));
    await openEntry(c, 'Natur');
    await click(named(c, '„Beta“ öffnen'));
    expect(c.querySelector('nav button[aria-current="page"]').textContent).toBe('Ressourcen');
    expect(c.querySelector('#field-title').value).toBe('Beta');
    expect(c.querySelector('#field-category_id').value).toBe('natur');
    expect(c.textContent).toContain('Ungespeicherte Änderungen');
  });
});
