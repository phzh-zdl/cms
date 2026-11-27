// Nach dem Zusammenfuehren: Ergebnis pruefen und zu loeschende Dateien abgleichen (final review I1).
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import SiteEditor from './SiteEditor.jsx';
import { parseCmsConfig } from '../config/cmsConfig.js';
import { serializeJson } from '../save/serialize.js';
import {
  makeSite, repoClient, contentFiles, RESOURCES, render, cleanup, select, button, click, nav, openEntry,
} from './__fixtures__/settingsSite.jsx';

beforeEach(() => { localStorage.clear(); });
afterEach(cleanup);

const commits = (client) => client.calls.filter((x) => x[0] === 'createCommit');
const dialog = (c) => c.querySelector('[role="dialog"]');
const inDialog = (c, text) => [...dialog(c).querySelectorAll('button')].find((b) => b.textContent === text);

describe('Zusammenfuehren: Ergebnis wird geprueft', () => {
  it('Fachbereich geloescht, die andere Person hat ihn zugeordnet: nicht gespeichert, Fehler am Eintrag', async () => {
    const theirs = [...RESOURCES, { id: 'r5', title: 'Epsilon', category_id: 'kunst', level_ids: [], featured: false }];
    const client = repoClient({ contents: { head1: contentFiles({ resources: theirs }) } });
    client.state.head = 'head1'; // jemand hat nach dem Oeffnen gespeichert
    const c = await render(<SiteEditor site={makeSite()} client={client} onBack={() => {}} />);
    await click(nav(c, 'Fachbereiche'));
    await openEntry(c, 'Kunst');
    await click(button(c, 'Löschen'));
    await select(c.querySelector('#delete-target'), 'natur');
    await click(inDialog(c, 'Löschen'));
    await click(button(c, 'Speichern'));

    expect(commits(client)).toHaveLength(0);
    expect(client.calls.some((x) => x[0] === 'updateRef')).toBe(false);
    const alert = c.querySelector('.save-bar [role="alert"]');
    expect(alert?.textContent).toContain('Bitte zuerst die markierten Fehler beheben.');
    expect(alert.textContent).toContain('Ressourcen');
    expect(c.textContent).not.toContain('Gespeichert.');
    expect(c.textContent).toContain('Ungespeicherte Änderungen');
    // Zusammengefuehrter Stand bleibt im Arbeitsstand: Kunst geloescht, Epsilon da und markiert
    expect(c.querySelector('.entry-list').textContent).not.toContain('Kunst');
    await click(nav(c, 'Ressourcen'));
    const epsilon = [...c.querySelectorAll('.entry-list button')].find((b) => b.textContent.includes('Epsilon'));
    expect(epsilon.textContent).toContain('Fehler');
    await openEntry(c, 'Epsilon');
    expect(c.textContent).toContain('Der gewählte Eintrag existiert nicht mehr. Bitte neu wählen.');
    // Die anderen zugeordneten Ressourcen (Beta, Delta) sind umgehaengt
    await select(c.querySelector('#field-category_id'), 'natur');
    await click(button(c, 'Speichern'));
    expect(commits(client)).toHaveLength(1);
    expect(c.textContent).toContain('Gespeichert.');
  });
});

describe('Zusammenfuehren: zu loeschende Dateien', () => {
  const config = parseCmsConfig({
    name: 'Test', export: { shell: 'build', zipName: 't' }, contentRoot: 'content',
    collections: [{
      id: 'resources', label: 'Ressourcen', file: 'resources.json', titleField: 'title', idField: { type: 'uuid' },
      fields: [
        { name: 'title', type: 'text', label: 'Titel', required: true },
        { name: 'image', type: 'image', label: 'Bild', dir: 'images' },
      ],
    }],
    pages: [],
  });
  const ALPHA = { id: 'r1', title: 'Alpha', image: 'old.webp' };
  const BETA = { id: 'r2', title: 'Beta', image: null };
  const PATH = 'content/resources.json';
  const IMG = 'content/images/old.webp';

  it('Eintrag geloescht, die andere Person hat ihn bearbeitet, "Die andere Version": Bild bleibt erhalten', async () => {
    const client = repoClient({ contents: { head1: { [PATH]: serializeJson([{ ...ALPHA, title: 'Alpha (neu)' }, BETA]) } } });
    client.state.head = 'head1';
    client.getTree = async () => [{ path: PATH, type: 'blob', sha: 'x' }, { path: IMG, type: 'blob', sha: 'y' }];
    client.getFileBytes = async () => null;
    const site = { repo: 'o/r', headSha: 'head0', config, original: { [PATH]: serializeJson([ALPHA, BETA]) },
      data: { resources: [ALPHA, BETA] }, pages: {}, settings: {} };
    const c = await render(<SiteEditor site={site} client={client} onBack={() => {}} />);
    await openEntry(c, 'Alpha');
    await click(button(c, 'Löschen'));
    await click(inDialog(c, 'Löschen'));
    await click(button(c, 'Speichern'));
    expect(dialog(c).textContent).toContain('Konflikt 1 von 1');
    await click(button(c, 'Die andere Version übernehmen'));

    // Kein Schreiben, das das noch verwendete Bild loescht
    const deleted = client.state.trees.flat().filter((e) => e.sha === null).map((e) => e.path);
    expect(deleted).not.toContain(IMG);
    expect(c.textContent).toContain('Alle Änderungen gespeichert.');
    expect(c.querySelector('.entry-list').textContent).toContain('Alpha (neu)');
  });
});
