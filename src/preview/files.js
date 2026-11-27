// Vorschau: die fertige Seite (Huelle) + der aktuelle Arbeitsstand des Editors als Dateiliste.
import { shellHead, shellEntries, loadBlobs } from '../export/shell.js';
import { serializeJson } from '../save/serialize.js';
import { contentPath } from '../content/site.js';

export const BANNER_DIRTY = 'Vorschau – enthält ungespeicherte Änderungen. Nicht veröffentlicht.';
export const BANNER_SAVED = 'Vorschau des gespeicherten Stands. Nicht veröffentlicht.';

const BANNER_STYLE = 'background:#de1a88;color:#fff;font-size:14px;line-height:1.4;padding:8px 16px;text-align:center;';

const TYPES = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8',
  json: 'application/json', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  svg: 'image/svg+xml', woff: 'font/woff', woff2: 'font/woff2', txt: 'text/plain; charset=utf-8', ico: 'image/x-icon',
};

// Typ aus der Endung. SVG gibt es nur in der Huelle, nie als Inhalt (Bilder sind nie SVG).
export function contentType(path) {
  const ext = path.includes('.') ? path.slice(path.lastIndexOf('.') + 1).toLowerCase() : '';
  if (ext === 'svg' && path.startsWith('content/')) return 'application/octet-stream';
  return TYPES[ext] ?? 'application/octet-stream';
}

// Band direkt nach dem ersten <body ...>; ohne body bleibt der Text unveraendert.
export function insertBanner(html, text) {
  return html.replace(/<body\b[^>]*>/i, (m) => `${m}<div role="note" style="${BANNER_STYLE}">${text}</div>`);
}

// Huelle pro Stand des build-Zweigs, nur fuer diese Sitzung (dieser Tab): "repo@sha" -> [{ path, bytes }]
const shellCache = new Map();
export const clearShellCache = () => shellCache.clear();

async function loadShell(client, repo, config, onProgress, extra) {
  const head = await shellHead(client, repo, config);
  const key = `${repo}@${head}`;
  if (shellCache.has(key)) return { files: shellCache.get(key), cached: true };
  const entries = await shellEntries(client, repo, head);
  const bytes = await loadBlobs(client, repo, entries, { onProgress, total: entries.length + extra.length });
  shellCache.set(key, bytes);
  return { files: bytes, cached: false, loaded: entries.length };
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Bilder, die der Arbeitsstand nutzt: Pfad im Repo -> Dateiname im Inhalt.
function usedImages(config, data) {
  const used = [];
  for (const c of config.collections) {
    for (const f of c.fields.filter((x) => x.type === 'image')) {
      for (const row of data[c.id] ?? []) {
        if (row[f.name]) used.push(contentPath(config, `${f.dir}/${row[f.name]}`));
      }
    }
  }
  return used;
}

// work = { data, pages, newImages: [{ path, bytes }], headSha (Stand, auf dem die Bilder liegen), dirty }
// -> Map<Pfad, { bytes, type }>; Pfade wie im fertigen Paket (content/... statt contentRoot/...).
export async function buildPreviewFiles(client, repo, config, work, { onProgress } = {}) {
  const prefix = `${config.contentRoot.replace(/\/+$/, '')}/`;
  const rel = (repoPath) => `content/${repoPath.slice(prefix.length)}`;

  // Inhalte: dieselbe Serialisierung wie beim Speichern, aber vollstaendig.
  const texts = [];
  for (const c of config.collections) {
    if (work.data[c.id] !== undefined) texts.push([contentPath(config, c.file), serializeJson(work.data[c.id])]);
  }
  for (const p of config.pages) {
    if (work.pages?.[p.id] !== undefined) texts.push([contentPath(config, p.file), serializeJson(work.pages[p.id])]);
  }

  // Bilder: neue aus dem Arbeitsstand, gespeicherte aus dem Stand `headSha`.
  const fresh = new Map((work.newImages ?? []).map((i) => [i.path, i.bytes]));
  const imagePaths = [...new Set(usedImages(config, work.data))];
  const saved = imagePaths.filter((p) => !fresh.has(p));
  let savedEntries = [];
  if (saved.length > 0) {
    const { treeSha } = await client.getCommit(repo, work.headSha);
    const tree = await client.getTree(repo, treeSha, true);
    const shaOf = new Map(tree.filter((e) => e.type === 'blob').map((e) => [e.path, e.sha]));
    savedEntries = saved.filter((p) => shaOf.has(p)).map((p) => ({ path: p, sha: shaOf.get(p) }));
  }

  const shell = await loadShell(client, repo, config, onProgress, savedEntries);
  const total = (shell.cached ? 0 : shell.loaded) + savedEntries.length;
  const savedBytes = await loadBlobs(client, repo, savedEntries, {
    onProgress, total, done: shell.cached ? 0 : shell.loaded,
  });

  const banner = work.dirty ? BANNER_DIRTY : BANNER_SAVED;
  const out = new Map();
  for (const [path, bytes] of Object.entries(shell.files)) {
    const type = contentType(path);
    out.set(path, {
      bytes: type.startsWith('text/html') ? encoder.encode(insertBanner(decoder.decode(bytes), banner)) : bytes,
      type,
    });
  }
  const put = (repoPath, bytes) => out.set(rel(repoPath), { bytes, type: contentType(rel(repoPath)) });
  for (const [path, text] of texts) put(path, encoder.encode(text));
  for (const path of imagePaths) {
    const bytes = fresh.get(path) ?? savedBytes[path];
    if (bytes) put(path, bytes);
  }
  return out;
}
