// Vorschau: die fertige Seite (Huelle) + der aktuelle Arbeitsstand des Editors als Dateiliste.
import { shellHead, shellEntries, loadBlobs, treeOf } from '../export/shell.js';
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

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// work = { data, pages, settings, newImages: [{ path, bytes }], removedFiles: [Repo-Pfade], dirty }
// Basis = ALLE Dateien unter contentRoot im aktuellen main (wie der Export); darueber der Arbeitsstand:
// konfigurierte Dateien (gleiche Serialisierung wie beim Speichern), neue Bilder, entfernte Dateien fallen weg.
// -> Map<Pfad, { bytes, type }>; Pfade wie im fertigen Paket (content/... statt contentRoot/...).
export async function buildPreviewFiles(client, repo, config, work, { onProgress } = {}) {
  const prefix = `${config.contentRoot.replace(/\/+$/, '')}/`;
  const rel = (repoPath) => `content/${repoPath.slice(prefix.length)}`;

  // Inhalte des Arbeitsstands.
  const texts = new Map();
  for (const c of config.collections) {
    if (work.data[c.id] !== undefined) texts.set(contentPath(config, c.file), serializeJson(work.data[c.id]));
  }
  for (const p of config.pages) {
    if (work.pages?.[p.id] !== undefined) texts.set(contentPath(config, p.file), serializeJson(work.pages[p.id]));
  }
  // Unberuehrte Einstellung (undefined): gespeicherte Datei aus main bzw. keine (Katalog nimmt Standardwerte).
  for (const st of config.settings ?? []) {
    if (work.settings?.[st.name] !== undefined) texts.set(contentPath(config, st.file), serializeJson(work.settings[st.name]));
  }
  const fresh = new Map((work.newImages ?? []).map((i) => [i.path, i.bytes]));
  const removed = new Set(work.removedFiles ?? []);

  // Basis aus dem aktuellen main; was der Arbeitsstand ersetzt oder entfernt, wird nicht geladen.
  const head = await shellHead(client, repo, config);
  const mainTree = await treeOf(client, repo, 'main');
  const baseEntries = mainTree
    .filter((e) => e.type === 'blob' && e.path.startsWith(prefix)
      && !texts.has(e.path) && !fresh.has(e.path) && !removed.has(e.path))
    .map((e) => ({ path: e.path, sha: e.sha }));

  const key = `${repo}@${head}`;
  const cachedShell = shellCache.get(key);
  const shellList = cachedShell ? null : await shellEntries(client, repo, head);
  const total = (shellList?.length ?? 0) + baseEntries.length;
  let done = 0;
  const count = (p) => { onProgress?.({ done: p.done + done, total }); };
  const shell = cachedShell ?? await loadBlobs(client, repo, shellList, { onProgress: count, total });
  if (!cachedShell) { shellCache.set(key, shell); done = shellList.length; }
  const base = await loadBlobs(client, repo, baseEntries, { onProgress: (p) => onProgress?.({ done: p.done, total }), total, done });

  const banner = work.dirty ? BANNER_DIRTY : BANNER_SAVED;
  const out = new Map();
  for (const [path, bytes] of Object.entries(shell)) {
    const type = contentType(path);
    out.set(path, {
      bytes: type.startsWith('text/html') ? encoder.encode(insertBanner(decoder.decode(bytes), banner)) : bytes,
      type,
    });
  }
  const put = (repoPath, bytes) => out.set(rel(repoPath), { bytes, type: contentType(rel(repoPath)) });
  for (const [path, bytes] of Object.entries(base)) put(path, bytes);
  for (const [path, text] of texts) put(path, encoder.encode(text));
  for (const [path, bytes] of fresh) if (!removed.has(path)) put(path, bytes);
  return out;
}
