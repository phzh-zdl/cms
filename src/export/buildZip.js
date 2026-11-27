import { zipSync } from 'fflate';
import { GitHubError } from '../github/client.js';

const MAX_PARALLEL = 6;
export const MSG_NOT_BUILT = 'Die Seite wurde noch nicht gebaut. Bitte die Entwicklerin/den Entwickler informieren.';
export const MSG_NO_CONTENT = 'Im gespeicherten Stand wurden keine Inhalte gefunden.';

const pad = (n) => String(n).padStart(2, '0');
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

async function treeOf(client, repo, branch) {
  const head = await client.getRef(repo, branch);
  const { treeSha } = await client.getCommit(repo, head);
  return client.getTree(repo, treeSha, true);
}

// Einfacher Worker-Pool: hoechstens `limit` Aufgaben gleichzeitig.
async function runPool(items, limit, task) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await task(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// ZIP = fertige Seite (Zweig `export.shell`, ohne content/) + aktuelle Inhalte aus main unter content/.
export async function buildExportZip(client, repo, config, { onProgress, now = new Date() } = {}) {
  let shellTree;
  try {
    shellTree = await treeOf(client, repo, config.export.shell);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) throw new Error(MSG_NOT_BUILT);
    throw e;
  }
  const mainTree = await treeOf(client, repo, 'main');

  const prefix = `${config.contentRoot}/`;
  const entries = [];
  for (const e of shellTree) {
    if (e.type === 'blob' && !e.path.startsWith('content/')) entries.push({ path: e.path, sha: e.sha });
  }
  let contentCount = 0;
  for (const e of mainTree) {
    if (e.type === 'blob' && e.path.startsWith(prefix)) {
      entries.push({ path: `content/${e.path.slice(prefix.length)}`, sha: e.sha });
      contentCount++;
    }
  }
  if (contentCount === 0) throw new Error(MSG_NO_CONTENT);

  const files = {};
  let done = 0;
  const total = entries.length;
  await runPool(entries, MAX_PARALLEL, async ({ path, sha }) => {
    files[path] = await client.getBlob(repo, sha);
    onProgress?.({ done: ++done, total });
  });

  const blob = new Blob([zipSync(files)], { type: 'application/zip' });
  return { blob, fileName: `${config.export.zipName}-${localDate(now)}.zip` };
}
