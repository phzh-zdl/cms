// Gemeinsame Bausteine von Export und Vorschau: die fertige Seite (Zweig `export.shell`) laden.
import { GitHubError } from '../github/client.js';

export const MAX_PARALLEL = 6;
export const MSG_NOT_BUILT = 'Die Seite wurde noch nicht gebaut. Bitte die Entwicklerin/den Entwickler informieren.';

export async function treeOf(client, repo, branch) {
  const head = await client.getRef(repo, branch);
  const { treeSha } = await client.getCommit(repo, head);
  return client.getTree(repo, treeSha, true);
}

// Einfacher Worker-Pool: hoechstens `limit` Aufgaben gleichzeitig.
export async function runPool(items, limit, task) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await task(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// Stand (Commit) des Huelle-Zweigs; fehlt der Zweig, die feste Meldung. Dient auch als Zwischenspeicher-Schluessel.
export async function shellHead(client, repo, config) {
  try {
    return await client.getRef(repo, config.export.shell);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) throw new Error(MSG_NOT_BUILT);
    throw e;
  }
}

// Dateien der Huelle ohne content/ (Pfad + Blob-Kennung).
export async function shellEntries(client, repo, head) {
  const { treeSha } = await client.getCommit(repo, head);
  const tree = await client.getTree(repo, treeSha, true);
  return tree
    .filter((e) => e.type === 'blob' && !e.path.startsWith('content/'))
    .map((e) => ({ path: e.path, sha: e.sha }));
}

// Blobs mit dem 6er-Pool laden; onProgress({ done, total }), mit `done`/`total` fuer vorangehende Schritte.
export async function loadBlobs(client, repo, entries, { onProgress, total = entries.length, done = 0 } = {}) {
  const out = {};
  let n = done;
  await runPool(entries, MAX_PARALLEL, async ({ path, sha }) => {
    out[path] = await client.getBlob(repo, sha);
    onProgress?.({ done: ++n, total });
  });
  return out;
}
