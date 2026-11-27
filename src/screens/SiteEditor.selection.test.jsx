import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import SiteEditor from './SiteEditor.jsx';
import {
  makeSite, repoClient, lastWrite, render, cleanup, type, button, named, click, nav,
} from './__fixtures__/settingsSite.jsx';

beforeEach(() => { localStorage.clear(); });
afterEach(cleanup);
const flush = () => act(async () => {});

async function openView(site = makeSite()) {
  const client = repoClient();
  const c = await render(<SiteEditor site={site} client={client} onBack={() => {}} />);
  await click(nav(c, 'Karussell (Im Fokus)'));
  return { c, client };
}
const selected = (c) => [...c.querySelectorAll('.pick-list.is-selected li .pick-title')].map((el) => el.textContent);
const heading = (c, text) => [...c.querySelectorAll('h2')].find((h) => h.textContent.startsWith(text));

describe('Seitenleiste mit Auswahl-Ansicht', () => {
  it('„Karussell (Im Fokus)“ direkt nach „Ressourcen“, Karussell nicht doppelt', async () => {
    const { c } = await openView();
    const navEl = c.querySelector('nav[aria-label="Inhalte"]');
    const headings = [...navEl.querySelectorAll('h2')].map((h) => h.textContent);
    expect(headings).toEqual(['Inhalte', 'Veröffentlichen']);
    const items = [...navEl.querySelectorAll('ul[aria-labelledby="nav-inhalte"] button')].map((b) => b.textContent);
    expect(items).toEqual(['Ressourcen', 'Karussell (Im Fokus)', 'Fachbereiche', 'Zielstufen']);
    expect([...navEl.querySelectorAll('button')].filter((b) => b.textContent === 'Karussell')).toHaveLength(0);
  });
});

describe('Auswahl-Ansicht', () => {
  it('Überschrift, Hilfetext, Einstellungen und nur ausgewählte Einträge in Sammlungsreihenfolge', async () => {
    const { c } = await openView();
    expect(c.querySelector('h1').textContent).toBe('Karussell (Im Fokus)');
    expect(c.querySelector('.selection-view .hint').textContent).toContain('Ausgewählte Ressourcen erscheinen zuerst');
    expect(heading(c, 'Einstellungen')).toBeDefined();
    expect(c.querySelector('#field-count')).not.toBeNull();
    expect(heading(c, 'Ausgewählt').textContent).toBe('Ausgewählt (2)');
    expect(selected(c)).toEqual(['Alpha', 'Gamma']);
    expect(named(c, '„Alpha“ entfernen').textContent).toBe('Entfernen');
  });

  it('Entfernen setzt false und markiert ungespeichert; gespeichert wird das Feld', async () => {
    const { c, client } = await openView();
    expect(c.textContent).toContain('Alle Änderungen gespeichert.');
    await click(named(c, '„Alpha“ entfernen'));
    expect(selected(c)).toEqual(['Gamma']);
    expect(heading(c, 'Ausgewählt').textContent).toBe('Ausgewählt (1)');
    expect(c.textContent).toContain('Ungespeicherte Änderungen');
    expect(document.activeElement).toBe(named(c, '„Gamma“ entfernen'));
    await click(button(c, 'Speichern'));
    const rows = JSON.parse(lastWrite(client)['content/resources.json']);
    expect(rows.find((r) => r.id === 'r1').featured).toBe(false);
    expect(rows.find((r) => r.id === 'r3').featured).toBe(true);
  });

  it('Alle abwählen: Abbrechen ändert nichts, Bestätigen setzt alle false', async () => {
    const { c } = await openView();
    await click(button(c, 'Alle abwählen'));
    let dlg = c.querySelector('[role="dialog"]');
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    expect(dlg.textContent).toContain('Alle 2 Ressourcen abwählen? Sie bleiben im Katalog, erscheinen aber nicht mehr fest im Karussell.');
    await click(button(c, 'Abbrechen'));
    await flush(); // Mikrotask fuer den Fokus
    expect(c.querySelector('[role="dialog"]')).toBeNull();
    expect(selected(c)).toEqual(['Alpha', 'Gamma']);
    expect(c.textContent).toContain('Alle Änderungen gespeichert.');
    expect(document.activeElement).toBe(button(c, 'Alle abwählen'));

    await click(button(c, 'Alle abwählen'));
    dlg = c.querySelector('[role="dialog"]');
    await click([...dlg.querySelectorAll('button')].find((b) => b.textContent === 'Abwählen'));
    await flush();
    expect(selected(c)).toEqual([]);
    expect(c.textContent).toContain('Noch nichts ausgewählt.');
    expect(button(c, 'Alle abwählen')).toBeUndefined();
    expect(c.textContent).toContain('Ungespeicherte Änderungen');
    expect(document.activeElement).toBe(c.querySelector('#selection-search'));
  });

  it('Hinzufügen per Suche (Gross/Kleinschreibung egal) setzt true, Trefferzahl live', async () => {
    const { c } = await openView();
    const search = c.querySelector('#selection-search');
    expect(c.querySelector(`label[for="selection-search"]`).textContent).toBe('Ressource hinzufügen');
    const live = c.querySelector('[aria-live="polite"]');
    await type(search, 'ELT');
    expect(live.textContent).toBe('1 Treffer');
    await type(search, 'a');
    expect(live.textContent).toBe('2 Treffer'); // Beta, Delta - ausgewählte nicht
    await type(search, 'zzz');
    expect(live.textContent).toBe('Keine Treffer');
    await type(search, 'delta');
    await click(named(c, '„Delta“ hinzufügen'));
    expect(selected(c)).toEqual(['Alpha', 'Gamma', 'Delta']);
    expect(c.textContent).toContain('Ungespeicherte Änderungen');
    expect(document.activeElement).toBe(search);
  });

  it('höchstens 10 Treffer', async () => {
    const many = Array.from({ length: 14 }, (_, i) => ({ id: `x${i}`, title: `Eintrag ${i}`, category_id: 'natur', level_ids: [], featured: false }));
    const site = makeSite();
    site.data = { ...site.data, resources: many };
    const { c } = await openView(site);
    await type(c.querySelector('#selection-search'), 'eintrag');
    expect(c.querySelectorAll('.pick-list.is-hits li')).toHaveLength(10);
    expect(c.querySelector('[aria-live="polite"]').textContent).toBe('14 Treffer, die ersten 10 werden gezeigt');
  });

  it('Öffnen führt zum Eintrag in der Sammlung', async () => {
    const { c } = await openView();
    await click(named(c, '„Gamma“ öffnen'));
    expect(c.querySelector('#field-title').value).toBe('Gamma');
    expect(c.querySelector('nav button[aria-current="page"]').textContent).toBe('Ressourcen');
    await click(button(c, 'Zurück zur Liste'));
    expect(c.querySelector('.entry-list')).not.toBeNull();
  });
});
