import { describe, it, expect, vi } from 'vitest';
import { listSites, loadSite, loadContentAt, contentPath } from './site.js';
import { parseCmsConfig } from '../config/cmsConfig.js';

const cms = {
  name: 'OER-Katalog',
  export: { shell: 'index.html', zipName: 'oer.zip' },
  contentRoot: 'public/content',
  collections: [{ id: 'resources', label: 'Ressourcen', file: 'resources.json', titleField: 'title', fields: [{ name: 'title', type: 'text' }] }],
  pages: [{ id: 'impressum', label: 'Impressum', file: 'pages/impressum.json' }],
};
const resourcesText = JSON.stringify([{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }]);
const pageText = JSON.stringify({ id: 'impressum', title: 'Impressum', html: '<p>Hi</p>' });

function fakeClient(files, repos) {
  return {
    listRepos: async () => repos ?? [],
    getRef: vi.fn(async () => 'sha123'),
    getFileText: vi.fn(async (repo, path) => {
      const f = files[`${repo}:${path}`];
      return f === undefined ? null : { text: f, sha: 'x' };
    }),
  };
}

describe('contentPath', () => {
  it('joins with a single slash', () => {
    expect(contentPath({ contentRoot: 'public/content' }, 'resources.json')).toBe('public/content/resources.json');
    expect(contentPath({ contentRoot: 'public/content/' }, '/pages/a.json')).toBe('public/content/pages/a.json');
  });
});

describe('listSites', () => {
  it('keeps only org repos with cms.json, sorts by name, lists broken ones with error', async () => {
    const client = fakeClient({
      'phzh-zdl/oer:cms.json': JSON.stringify(cms),
      'phzh-zdl/zeta:cms.json': JSON.stringify({ ...cms, name: 'Zeta' }),
      'phzh-zdl/broken:cms.json': JSON.stringify({ name: 'x' }),
      'other/foreign:cms.json': JSON.stringify(cms),
    }, [
      { full_name: 'phzh-zdl/zeta' }, { full_name: 'phzh-zdl/oer' }, { full_name: 'phzh-zdl/plain' },
      { full_name: 'phzh-zdl/broken' }, { full_name: 'other/foreign' },
    ]);
    const sites = await listSites(client);
    expect(sites.map((s) => s.repo)).toEqual(['phzh-zdl/oer', 'phzh-zdl/zeta', 'phzh-zdl/broken']);
    expect(sites[0].name).toBe('OER-Katalog');
    expect(sites[2].name).toBeNull();
    expect(sites[2].error).toMatch(/^cms\.json:/);
    expect(client.getFileText).toHaveBeenCalledWith('phzh-zdl/oer', 'cms.json', 'main');
    expect(client.getFileText).not.toHaveBeenCalledWith('other/foreign', 'cms.json', 'main');
  });

  it('lists a repo whose cms.json is not valid JSON as broken', async () => {
    const client = fakeClient({ 'phzh-zdl/x:cms.json': '{nope' }, [{ full_name: 'phzh-zdl/x' }]);
    const [s] = await listSites(client);
    expect(s.name).toBeNull();
    expect(s.error).toMatch(/JSON/);
  });
});

describe('loadSite', () => {
  const files = {
    'o/r:cms.json': JSON.stringify(cms),
    'o/r:public/content/resources.json': resourcesText,
    'o/r:public/content/pages/impressum.json': pageText,
  };

  it('loads everything at headSha', async () => {
    const client = fakeClient(files);
    const site = await loadSite(client, 'o/r');
    expect(site.repo).toBe('o/r');
    expect(site.headSha).toBe('sha123');
    expect(site.config.name).toBe('OER-Katalog');
    expect(site.data.resources).toHaveLength(2);
    expect(site.pages.impressum.html).toBe('<p>Hi</p>');
    expect(site.original['public/content/resources.json']).toBe(resourcesText);
    expect(site.original['public/content/pages/impressum.json']).toBe(pageText);
    expect(client.getRef).toHaveBeenCalledWith('o/r', 'main');
    for (const call of client.getFileText.mock.calls) expect(call[2]).toBe('sha123');
  });

  it('throws "Datei fehlt" for a missing collection file', async () => {
    const client = fakeClient({ ...files, 'o/r:public/content/resources.json': undefined });
    await expect(loadSite(client, 'o/r')).rejects.toThrow('Datei fehlt: public/content/resources.json');
  });

  it('throws on invalid JSON with the path', async () => {
    const client = fakeClient({ ...files, 'o/r:public/content/resources.json': '{kaputt' });
    await expect(loadSite(client, 'o/r')).rejects.toThrow('Datei ist kein gültiges JSON: public/content/resources.json');
  });

  it('passes through parseCmsConfig errors', async () => {
    const client = fakeClient({ 'o/r:cms.json': JSON.stringify({ name: 'x' }) });
    await expect(loadSite(client, 'o/r')).rejects.toThrow(/^cms\.json:/);
  });

  it('throws when cms.json is missing', async () => {
    await expect(loadSite(fakeClient({}), 'o/r')).rejects.toThrow('Datei fehlt: cms.json');
  });
});

describe('loadContentAt', () => {
  it('liest die Inhalte einer bestimmten Version, ohne cms.json', async () => {
    const client = fakeClient({
      'o/r:public/content/resources.json': resourcesText,
      'o/r:public/content/pages/impressum.json': pageText,
    });
    const content = await loadContentAt(client, 'o/r', parseCmsConfig(cms), 'old1');
    expect(content.data.resources).toHaveLength(2);
    expect(content.pages.impressum.title).toBe('Impressum');
    expect(Object.keys(content.original).sort()).toEqual(['public/content/pages/impressum.json', 'public/content/resources.json']);
    expect(client.getRef).not.toHaveBeenCalled();
    for (const call of client.getFileText.mock.calls) expect(call[2]).toBe('old1');
  });
});

describe('Einstellungsdateien (settings)', () => {
  const withSettings = { ...cms, settings: [{ name: 'carousel', label: 'Karussell', file: 'carousel.json', fields: [{ name: 'count', type: 'number' }] }] };
  const base = {
    'o/r:public/content/resources.json': resourcesText,
    'o/r:public/content/pages/impressum.json': pageText,
  };
  it('fehlende Datei ist kein Fehler: settings-Wert undefined, nicht in original', async () => {
    const content = await loadContentAt(fakeClient(base), 'o/r', parseCmsConfig(withSettings), 's1');
    expect(content.settings).toEqual({});
    expect(Object.keys(content.original)).not.toContain('public/content/carousel.json');
  });
  it('vorhandene Datei wird geladen', async () => {
    const text = JSON.stringify({ count: 5 });
    const content = await loadContentAt(fakeClient({ ...base, 'o/r:public/content/carousel.json': text }), 'o/r', parseCmsConfig(withSettings), 's1');
    expect(content.settings.carousel).toEqual({ count: 5 });
    expect(content.original['public/content/carousel.json']).toBe(text);
  });
});
