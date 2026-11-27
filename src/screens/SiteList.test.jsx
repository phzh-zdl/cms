import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SiteList from './SiteList.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container, root;
afterEach(() => { act(() => root?.unmount()); container?.remove(); container = root = null; });

async function render(ui) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(ui));
  return container;
}

const clientWith = (repos, files) => ({
  listRepos: async () => repos,
  getFileText: async (repo) => (files[repo] === undefined ? null : { text: files[repo], sha: 's' }),
});

describe('SiteList', () => {
  it('shows the empty state', async () => {
    const el = await render(<SiteList client={clientWith([], {})} onSelect={() => {}} />);
    expect(el.querySelector('h1').textContent).toBe('Seite wählen');
    expect(el.textContent).toContain('Keine Seiten gefunden. Ihr Zugangsschlüssel hat keinen Zugriff auf eine Seite mit CMS-Beschreibung.');
  });

  it('shows loading text first', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<SiteList client={{ listRepos: () => new Promise(() => {}) }} onSelect={() => {}} />));
    expect(container.textContent).toContain('Seiten werden geladen …');
  });

  it('lists a good site as a button and a broken one disabled with its error', async () => {
    const good = JSON.stringify({
      name: 'OER-Katalog', export: { shell: 's', zipName: 'z' }, contentRoot: 'c',
      collections: [{ id: 'a', file: 'a.json', titleField: 't', fields: [] }],
    });
    const onSelect = vi.fn();
    const el = await render(<SiteList onSelect={onSelect} client={clientWith(
      [{ full_name: 'phzh-zdl/ok' }, { full_name: 'phzh-zdl/bad' }],
      { 'phzh-zdl/ok': good, 'phzh-zdl/bad': '{"name":"x"}' },
    )} />);
    const buttons = [...el.querySelectorAll('button')];
    const ok = buttons.find((b) => b.textContent.includes('OER-Katalog'));
    expect(ok.disabled).toBe(false);
    act(() => ok.click());
    expect(onSelect).toHaveBeenCalledWith('phzh-zdl/ok');
    const bad = buttons.find((b) => b.disabled);
    expect(bad.textContent).toContain('phzh-zdl/bad');
    expect(el.textContent).toContain('Beschreibung fehlerhaft: cms.json:');
  });

  it('shows an error message when listing fails', async () => {
    const el = await render(<SiteList onSelect={() => {}} client={{ listRepos: async () => { throw new Error('Keine Verbindung.'); } }} />);
    expect(el.querySelector('[role="alert"]').textContent).toContain('Keine Verbindung.');
  });
});
