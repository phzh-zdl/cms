import { describe, it, expect } from 'vitest';
import { saveChanges } from './saveChanges.js';
import { AuthError, ConflictError } from '../github/client.js';

function fakeClient({ treePaths = ['public/content/resources.json', 'public/content/images/old.png'], fail = {} } = {}) {
  const calls = [];
  let n = 0;
  const step = (name, args, result) => {
    calls.push([name, ...args]);
    if (fail[name]) throw fail[name];
    return result;
  };
  return {
    calls,
    getCommit: async (...a) => step('getCommit', a, { treeSha: 'tree0' }),
    getTree: async (...a) => step('getTree', a, treePaths.map((path) => ({ path, type: 'blob', sha: 'x', mode: '100644' }))),
    createBlob: async (...a) => step('createBlob', a, `blob${++n}`),
    createTree: async (...a) => step('createTree', a, 'tree1'),
    createCommit: async (...a) => step('createCommit', a, 'commit1'),
    updateRef: async (...a) => step('updateRef', a, undefined),
  };
}

const changes = [
  { path: 'public/content/resources.json', text: '[]\n' },
  { path: 'public/content/images/a.png', bytes: new Uint8Array([1, 2, 3]) },
  { path: 'public/content/images/old.png', delete: true },
  { path: 'public/content/images/never-saved.png', delete: true },
];

describe('saveChanges', () => {
  it('Blobs, Tree auf Basis-Tree, Commit mit Parent, Ref ohne Force - in dieser Reihenfolge', async () => {
    const c = fakeClient();
    const sha = await saveChanges(c, 'o/r', { baseSha: 'base', changes, message: 'Ressource „A“ geändert' });
    expect(sha).toBe('commit1');
    expect(c.calls.map((x) => x[0])).toEqual(['getCommit', 'getTree', 'createBlob', 'createBlob', 'createTree', 'createCommit', 'updateRef']);
    expect(c.calls[0]).toEqual(['getCommit', 'o/r', 'base']);
    expect(c.calls[1]).toEqual(['getTree', 'o/r', 'tree0', true]);
    expect(new TextDecoder().decode(c.calls[2][2])).toBe('[]\n');
    expect(c.calls[3][2]).toEqual(new Uint8Array([1, 2, 3]));
    expect(c.calls[4]).toEqual(['createTree', 'o/r', 'tree0', [
      { path: 'public/content/resources.json', sha: 'blob1' },
      { path: 'public/content/images/a.png', sha: 'blob2' },
      { path: 'public/content/images/old.png', sha: null },
    ]]);
    expect(c.calls[5]).toEqual(['createCommit', 'o/r', 'Ressource „A“ geändert', 'tree1', 'base']);
    expect(c.calls[6]).toEqual(['updateRef', 'o/r', 'main', 'commit1']);
  });

  it('nichts zu tun (nur nie gespeicherte Dateien) -> kein Commit', async () => {
    const c = fakeClient();
    const sha = await saveChanges(c, 'o/r', { baseSha: 'base', changes: [changes[3]], message: 'x' });
    expect(sha).toBe('base');
    expect(c.calls.map((x) => x[0])).toEqual(['getCommit', 'getTree']);
  });

  it('AuthError wird unveraendert weitergegeben', async () => {
    const err = new AuthError(401, 'x');
    const c = fakeClient({ fail: { createBlob: err } });
    await expect(saveChanges(c, 'o/r', { baseSha: 'base', changes, message: 'm' })).rejects.toBe(err);
  });

  it('ConflictError wird unveraendert weitergegeben', async () => {
    const err = new ConflictError(422, 'x');
    const c = fakeClient({ fail: { updateRef: err } });
    await expect(saveChanges(c, 'o/r', { baseSha: 'base', changes, message: 'm' })).rejects.toBe(err);
  });
});
