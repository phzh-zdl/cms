// Seiten (Repos mit cms.json) finden und eine Seite vollstaendig laden.
import { parseCmsConfig } from '../config/cmsConfig.js';
import { DEFAULT_ORG } from './siteHash.js';

const BRANCH = 'main';
const CONCURRENCY = 6;

export const contentPath = (config, file) =>
  `${config.contentRoot.replace(/\/+$/, '')}/${file.replace(/^\/+/, '')}`;

function parseConfigText(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('cms.json ist kein gültiges JSON.');
  }
  return parseCmsConfig(json);
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export async function listSites(client, org = DEFAULT_ORG) {
  const repos = (await client.listRepos()).filter((r) => r.full_name.startsWith(`${org}/`));
  const found = await mapLimit(repos, CONCURRENCY, async ({ full_name: repo }) => {
    const file = await client.getFileText(repo, 'cms.json', BRANCH);
    if (!file) return null;
    try {
      return { repo, name: parseConfigText(file.text).name };
    } catch (e) {
      return { repo, name: null, error: e.message };
    }
  });
  const label = (s) => s.name ?? s.repo;
  return found.filter(Boolean).sort((a, b) => {
    if ((a.name === null) !== (b.name === null)) return a.name === null ? 1 : -1;
    return label(a).localeCompare(label(b), 'de');
  });
}

function readers(client, repo, sha, original) {
  // optional: fehlende Datei = undefined statt Fehler (Einstellungen entstehen beim ersten Speichern).
  async function readText(path, { optional = false } = {}) {
    const file = await client.getFileText(repo, path, sha);
    if (!file) {
      if (optional) return undefined;
      throw new Error(`Datei fehlt: ${path}`);
    }
    original[path] = file.text;
    return file.text;
  }
  async function readJson(path, opts) {
    const text = await readText(path, opts);
    if (text === undefined) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Datei ist kein gültiges JSON: ${path}`);
    }
  }
  return { readText, readJson };
}

// Inhalte (Sammlungen, Textseiten, Einstellungen) einer bestimmten Version; die cms.json bleibt die gegebene.
// Eine fehlende Einstellungsdatei fehlt auch in settings (der Editor zeigt dann die Standardwerte).
export async function loadContentAt(client, repo, config, sha) {
  const original = {};
  const { readJson } = readers(client, repo, sha, original);
  const data = {};
  const pages = {};
  const settings = {};
  await Promise.all([
    ...config.collections.map(async (c) => { data[c.id] = await readJson(contentPath(config, c.file)); }),
    ...config.pages.map(async (p) => { pages[p.id] = await readJson(contentPath(config, p.file)); }),
    ...(config.settings ?? []).map(async (s) => {
      const value = await readJson(contentPath(config, s.file), { optional: true });
      if (value !== undefined) settings[s.name] = value;
    }),
  ]);
  return { original, data, pages, settings };
}

export async function loadSite(client, repo) {
  const headSha = await client.getRef(repo, BRANCH);
  const config = parseConfigText(await readers(client, repo, headSha, {}).readText('cms.json'));
  const { original, data, pages, settings } = await loadContentAt(client, repo, config, headSha);
  return { repo, config, headSha, original, data, pages, settings };
}
