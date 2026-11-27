import { zipSync } from 'fflate';
import { MSG_NOT_BUILT, treeOf, shellHead, shellEntries, loadBlobs } from './shell.js';

export { MSG_NOT_BUILT };
export const MSG_NO_CONTENT = 'Im gespeicherten Stand wurden keine Inhalte gefunden.';

const pad = (n) => String(n).padStart(2, '0');
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ZIP = fertige Seite (Zweig `export.shell`, ohne content/) + aktuelle Inhalte aus main unter content/.
export async function buildExportZip(client, repo, config, { onProgress, now = new Date() } = {}) {
  const entries = await shellEntries(client, repo, await shellHead(client, repo, config));
  const mainTree = await treeOf(client, repo, 'main');

  const prefix = `${config.contentRoot}/`;
  let contentCount = 0;
  for (const e of mainTree) {
    if (e.type === 'blob' && e.path.startsWith(prefix)) {
      entries.push({ path: `content/${e.path.slice(prefix.length)}`, sha: e.sha });
      contentCount++;
    }
  }
  if (contentCount === 0) throw new Error(MSG_NO_CONTENT);

  const files = await loadBlobs(client, repo, entries, { onProgress });

  const blob = new Blob([zipSync(files)], { type: 'application/zip' });
  return { blob, fileName: `${config.export.zipName}-${localDate(now)}.zip` };
}
