import { describe, it, expect } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { buildExportZip } from './buildZip.js';
import { GitHubError } from '../github/client.js';

const enc = (s) => new TextEncoder().encode(s);
const config = { contentRoot: 'public/content', export: { shell: 'build', zipName: 'oer-katalog' } };

function makeClient({ shell = true, mainEntries } = {}) {
  const blobs = {
    s_index: 'INDEX', s_js: 'JS', s_old: 'OLD-SNAPSHOT', s_info: 'INFO', s_dir: '',
    m_res: 'NEW-RES', m_img: 'IMG',
  };
  const trees = {
    tBuild: [
      { path: 'index.html', type: 'blob', sha: 's_index' },
      { path: 'assets', type: 'tree', sha: 's_dir' },
      { path: 'assets/x.js', type: 'blob', sha: 's_js' },
      { path: 'BUILD_INFO.txt', type: 'blob', sha: 's_info' },
      { path: 'content', type: 'tree', sha: 's_dir' },
      { path: 'content/resources.json', type: 'blob', sha: 's_old' },
    ],
    tMain: mainEntries ?? [
      { path: 'public', type: 'tree', sha: 's_dir' },
      { path: 'public/content/resources.json', type: 'blob', sha: 'm_res' },
      { path: 'public/content/img/a.webp', type: 'blob', sha: 'm_img' },
      { path: 'src/app.js', type: 'blob', sha: 's_js' },
    ],
  };
  let active = 0;
  const c = { maxActive: 0, refs: [] };
  return Object.assign(c, {
    async getRef(repo, branch) {
      c.refs.push(branch);
      if (branch === 'build' && !shell) throw new GitHubError(404, 'Nicht gefunden.');
      return branch === 'build' ? 'cBuild' : 'cMain';
    },
    async getCommit(repo, sha) { return { treeSha: sha === 'cBuild' ? 'tBuild' : 'tMain' }; },
    async getTree(repo, sha) { return trees[sha]; },
    async getBlob(repo, sha) {
      active++; c.maxActive = Math.max(c.maxActive, active);
      await new Promise((r) => setTimeout(r, 2));
      active--;
      return enc(blobs[sha]);
    },
  });
}

const unzip = async (blob) => unzipSync(new Uint8Array(await blob.arrayBuffer()));
const NOW = new Date(2026, 10, 27, 12, 0, 0);

describe('buildExportZip', () => {
  it('kombiniert Shell aus build mit Inhalten aus aktuellem main', async () => {
    const client = makeClient();
    const { blob, fileName } = await buildExportZip(client, 'o/r', config, { now: NOW });
    const files = await unzip(blob);
    expect(Object.keys(files).sort()).toEqual([
      'BUILD_INFO.txt', 'assets/x.js', 'content/img/a.webp', 'content/resources.json', 'index.html',
    ]);
    expect(strFromU8(files['content/resources.json'])).toBe('NEW-RES');
    expect(strFromU8(files['index.html'])).toBe('INDEX');
    expect(Object.keys(files).some((p) => p.startsWith('public/'))).toBe(false);
    expect(blob.type).toBe('application/zip');
    expect(fileName).toBe('oer-katalog-2026-11-27.zip');
    expect(client.refs).toEqual(['build', 'main']);
  });

  it('fehlender build-Branch: feste Meldung', async () => {
    await expect(buildExportZip(makeClient({ shell: false }), 'o/r', config, { now: NOW }))
      .rejects.toThrow('Die Seite wurde noch nicht gebaut. Bitte die Entwicklerin/den Entwickler informieren.');
  });

  it('keine Inhalte in main: feste Meldung', async () => {
    const client = makeClient({ mainEntries: [{ path: 'src/app.js', type: 'blob', sha: 's_js' }] });
    await expect(buildExportZip(client, 'o/r', config, { now: NOW }))
      .rejects.toThrow('Im gespeicherten Stand wurden keine Inhalte gefunden.');
  });

  it('meldet Fortschritt bis total und laedt maximal 6 parallel', async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ path: `public/content/f${i}.json`, type: 'blob', sha: 'm_res' }));
    const client = makeClient({ mainEntries: many });
    const seen = [];
    await buildExportZip(client, 'o/r', config, { now: NOW, onProgress: (p) => seen.push(p) });
    // Shell: index.html, assets/x.js, BUILD_INFO.txt = 3, plus 30 Inhalte
    expect(seen.at(-1)).toEqual({ done: 33, total: 33 });
    expect(seen.map((p) => p.done)).toEqual([...Array(33).keys()].map((i) => i + 1));
    expect(client.maxActive).toBeLessThanOrEqual(6);
    expect(client.maxActive).toBeGreaterThan(1);
  });
});
