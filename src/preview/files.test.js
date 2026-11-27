import { describe, it, expect, beforeEach } from 'vitest';
import { buildPreviewFiles, contentType, insertBanner, clearShellCache, BANNER_DIRTY, BANNER_SAVED } from './files.js';
import { GitHubError } from '../github/client.js';

const enc = (s) => new TextEncoder().encode(s);
const dec = (b) => new TextDecoder().decode(b);
const config = {
  contentRoot: 'public/content', export: { shell: 'build', zipName: 'x' },
  collections: [{
    id: 'resources', file: 'resources.json', key: 'id',
    fields: [{ name: 'id', type: 'slug' }, { name: 'title', type: 'text' }, { name: 'image', type: 'image', dir: 'images' }],
  }],
  pages: [{ id: 'impressum', file: 'pages/impressum.json' }],
};

function makeClient({ shell = true, buildSha = 'cBuild' } = {}) {
  const blobs = { s_index: '<html><body class="x"><p>Hi</p></body></html>', s_js: 'JS', s_old: 'OLD', m_img: 'SAVED-IMG', m_unused: 'UNUSED', m_extra: '{"x":1}', m_res: 'MAIN-RES', m_src: 'SRC' };
  const trees = {
    tBuild: [
      { path: 'index.html', type: 'blob', sha: 's_index' },
      { path: 'assets/x.js', type: 'blob', sha: 's_js' },
      { path: 'content', type: 'tree', sha: 'd' },
      { path: 'content/resources.json', type: 'blob', sha: 's_old' },
    ],
    tMain: [
      { path: 'public/content/images/a.webp', type: 'blob', sha: 'm_img' },
      { path: 'public/content/images/unused.webp', type: 'blob', sha: 'm_unused' },
      { path: 'public/content/extra.json', type: 'blob', sha: 'm_extra' },
      { path: 'public/content/resources.json', type: 'blob', sha: 'm_res' },
      { path: 'src/app.js', type: 'blob', sha: 'm_src' },
    ],
  };
  const c = { getBlobs: [], getTrees: [], maxActive: 0 };
  let active = 0;
  return Object.assign(c, {
    async getRef(repo, branch) {
      if (branch === 'build' && !shell) throw new GitHubError(404, 'Nicht gefunden.');
      return branch === 'build' ? buildSha : 'head1';
    },
    async getCommit(repo, sha) { return { treeSha: sha === buildSha ? 'tBuild' : 'tMain' }; },
    async getTree(repo, sha) { c.getTrees.push(sha); return trees[sha]; },
    async getBlob(repo, sha) {
      c.getBlobs.push(sha);
      active++; c.maxActive = Math.max(c.maxActive, active);
      await new Promise((r) => setTimeout(r, 2));
      active--;
      return enc(blobs[sha]);
    },
  });
}

const work = (over = {}) => ({
  headSha: 'head1', dirty: true, newImages: [],
  data: { resources: [{ id: 'a', title: 'Neuer Titel', image: 'a.webp' }] },
  pages: { impressum: { id: 'impressum', title: 'Impressum', html: '<p>x</p>' } },
  ...over,
});

beforeEach(() => clearShellCache());

describe('buildPreviewFiles', () => {
  it('Huelle ohne content/, Inhalte aus dem ungespeicherten Arbeitsstand', async () => {
    const files = await buildPreviewFiles(makeClient(), 'o/r', config, work());
    expect([...files.keys()].sort()).toEqual([
      'assets/x.js', 'content/extra.json', 'content/images/a.webp', 'content/images/unused.webp',
      'content/pages/impressum.json', 'content/resources.json', 'index.html',
    ]);
    expect(dec(files.get('content/resources.json').bytes)).toContain('Neuer Titel');
    expect(dec(files.get('content/resources.json').bytes)).not.toContain('OLD');
    expect(JSON.parse(dec(files.get('content/pages/impressum.json').bytes)).title).toBe('Impressum');
    expect(files.get('content/resources.json').type).toBe('application/json');
  });

  it('Einstellungen: geaenderte ersetzt die Datei aus main, unberuehrte bleibt wie gespeichert', async () => {
    const cfg = { ...config, settings: [{ name: 'extra', file: 'extra.json', fields: [] }] };
    const changed = await buildPreviewFiles(makeClient(), 'o/r', cfg, work({ settings: { extra: { x: 2 } } }));
    expect(JSON.parse(dec(changed.get('content/extra.json').bytes))).toEqual({ x: 2 });
    clearShellCache();
    const untouched = await buildPreviewFiles(makeClient(), 'o/r', cfg, work({ settings: {} }));
    expect(dec(untouched.get('content/extra.json').bytes)).toBe('{"x":1}');
  });

  it('Basis wie Export: nicht konfigurierte Datei und unreferenziertes Bild aus main erscheinen', async () => {
    const files = await buildPreviewFiles(makeClient(), 'o/r', config, work());
    expect(dec(files.get('content/extra.json').bytes)).toBe('{"x":1}');
    expect(dec(files.get('content/images/unused.webp').bytes)).toBe('UNUSED');
    expect(files.has('src/app.js')).toBe(false);
  });

  it('Arbeitsstand gewinnt gegen main; entfernte Dateien fallen weg', async () => {
    const client = makeClient();
    const files = await buildPreviewFiles(client, 'o/r', config, work({ removedFiles: ['public/content/images/unused.webp'] }));
    expect(dec(files.get('content/resources.json').bytes)).toContain('Neuer Titel');
    expect(client.getBlobs).not.toContain('m_res');
    expect(files.has('content/images/unused.webp')).toBe(false);
  });

  it('gespeichertes Bild kommt aus main', async () => {
    const client = makeClient();
    const files = await buildPreviewFiles(client, 'o/r', config, work());
    expect(dec(files.get('content/images/a.webp').bytes)).toBe('SAVED-IMG');
    expect(files.get('content/images/a.webp').type).toBe('image/webp');
  });

  it('neu hochgeladenes Bild stammt aus dem Arbeitsstand, ohne Abruf', async () => {
    const client = makeClient();
    const bytes = new Uint8Array([1, 2, 3]);
    const files = await buildPreviewFiles(client, 'o/r', config, work({
      data: { resources: [{ id: 'n', title: 'N', image: 'new.webp' }] },
      newImages: [{ path: 'public/content/images/new.webp', bytes }],
    }));
    expect(files.get('content/images/new.webp').bytes).toBe(bytes);
    expect(files.has('content/images/a.webp')).toBe(true); // main-Bild bleibt, wenn nicht entfernt
  });

  it('geloeschter Eintrag fehlt samt Bild', async () => {
    const files = await buildPreviewFiles(makeClient(), 'o/r', config, work({ data: { resources: [] }, removedFiles: ['public/content/images/a.webp'] }));
    expect(dec(files.get('content/resources.json').bytes).trim()).toBe('[]');
    expect(files.has('content/images/a.webp')).toBe(false);
  });

  it('Huelle wird bei gleichem Build-Stand nicht neu geladen, bei neuem schon', async () => {
    const client = makeClient();
    await buildPreviewFiles(client, 'o/r', config, work());
    const first = client.getBlobs.filter((s) => s === 's_js').length;
    await buildPreviewFiles(client, 'o/r', config, work());
    expect(client.getBlobs.filter((s) => s === 's_js').length).toBe(first);
    expect(client.getTrees.filter((t) => t === 'tBuild').length).toBe(1);
    const other = makeClient({ buildSha: 'cNeu' });
    await buildPreviewFiles(other, 'o/r', config, work());
    expect(other.getBlobs).toContain('s_js');
  });

  it('Banner nur in HTML, Text je nach Stand', async () => {
    const dirty = await buildPreviewFiles(makeClient(), 'o/r', config, work({ dirty: true }));
    const idx = dec(dirty.get('index.html').bytes);
    expect(idx).toContain(`>${BANNER_DIRTY}</div>`);
    expect(idx.indexOf('role="note"')).toBeGreaterThan(idx.indexOf('<body class="x">'));
    expect(dec(dirty.get('assets/x.js').bytes)).toBe('JS');
    const saved = await buildPreviewFiles(makeClient(), 'o/r', config, work({ dirty: false }));
    expect(dec(saved.get('index.html').bytes)).toContain(BANNER_SAVED);
    expect(dirty.get('index.html').type).toBe('text/html; charset=utf-8');
  });

  it('Banner-Texte', () => {
    expect(BANNER_DIRTY).toBe('Vorschau – enthält ungespeicherte Änderungen. Nicht veröffentlicht.');
    expect(BANNER_SAVED).toBe('Vorschau des gespeicherten Stands. Nicht veröffentlicht.');
  });

  it('Fortschritt zaehlt ueber alle Dateien, 6er-Pool', async () => {
    const client = makeClient();
    const seen = [];
    await buildPreviewFiles(client, 'o/r', config, work(), { onProgress: (p) => seen.push(p) });
    expect(seen.at(-1)).toEqual({ done: seen.at(-1).total, total: seen.at(-1).total });
    expect(client.maxActive).toBeLessThanOrEqual(6);
  });

  it('fehlender build-Zweig: Meldung wie beim Export', async () => {
    await expect(buildPreviewFiles(makeClient({ shell: false }), 'o/r', config, work()))
      .rejects.toThrow('Die Seite wurde noch nicht gebaut. Bitte die Entwicklerin/den Entwickler informieren.');
  });
});

describe('contentType', () => {
  it.each([
    ['a/b.html', 'text/html; charset=utf-8'], ['a.js', 'text/javascript; charset=utf-8'],
    ['a.css', 'text/css; charset=utf-8'], ['a.json', 'application/json'], ['a.webp', 'image/webp'],
    ['a.png', 'image/png'], ['a.jpg', 'image/jpeg'], ['a.jpeg', 'image/jpeg'], ['assets/l.svg', 'image/svg+xml'],
    ['a.woff', 'font/woff'], ['a.woff2', 'font/woff2'], ['a.txt', 'text/plain; charset=utf-8'],
    ['favicon.ico', 'image/x-icon'], ['a.xyz', 'application/octet-stream'], ['noext', 'application/octet-stream'],
    ['content/images/x.svg', 'application/octet-stream'],
  ])('%s', (path, type) => expect(contentType(path)).toBe(type));
});

describe('insertBanner', () => {
  it('direkt nach <body> und nach <body class=...>', () => {
    expect(insertBanner('<body><p>x</p>', 'T')).toMatch(/^<body><div role="note" style="[^"]*">T<\/div><p>x<\/p>/);
    expect(insertBanner('<BODY class="a b" id=x><p>', 'T')).toMatch(/^<BODY class="a b" id=x><div role="note"/);
  });
  it('Banner: Magenta, weiss, 14px, nicht fixiert', () => {
    const html = insertBanner('<body>', 'T');
    expect(html).toContain('#de1a88');
    expect(html).toMatch(/color:\s*#fff/);
    expect(html).toContain('14px');
    expect(html).not.toContain('fixed');
    expect(html).not.toContain('sticky');
  });
  it('ohne body unveraendert', () => {
    expect(insertBanner('<p>x</p>', 'T')).toBe('<p>x</p>');
  });
});
