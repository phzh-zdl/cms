// Inhaltsdateien im Format von Teil 1: 2 Leerzeichen, Zeilenumbruch am Ende,
// Feldreihenfolge wie im Arbeitsstand (JSON.stringify behaelt sie bei).
import { contentPath } from '../content/site.js';

export const serializeJson = (value) => JSON.stringify(value, null, 2) + '\n';

// Gleich = gleicher Inhalt in gleicher Feldreihenfolge. So zaehlen weder
// Windows-Zeilenenden noch abweichende Einrueckung im Original als Aenderung;
// wird die Datei wirklich geaendert, schreiben wir sie im Standardformat.
function unchanged(value, originalText) {
  if (typeof originalText !== 'string') return false;
  try {
    return serializeJson(JSON.parse(originalText)) === serializeJson(value);
  } catch {
    return false;
  }
}

// site: { config, original: { [Repo-Pfad]: Text } } (die Basis, gegen die verglichen wird).
// Liefert { path, text } | { path, bytes } | { path, delete: true } - nur echte Aenderungen.
export function collectChanges(site, data, pages, newImages = [], removedFiles = []) {
  const { config, original } = site;
  const out = [];
  const textFile = (file, value) => {
    if (value === undefined) return;
    const path = contentPath(config, file);
    if (!unchanged(value, original[path])) out.push({ path, text: serializeJson(value) });
  };
  for (const c of config.collections) textFile(c.file, data[c.id]);
  for (const p of config.pages) textFile(p.file, pages?.[p.id]);
  for (const img of newImages) out.push({ path: img.path, bytes: img.bytes });
  const written = new Set(out.map((c) => c.path));
  for (const path of new Set(removedFiles)) {
    if (!written.has(path)) out.push({ path, delete: true });
  }
  return out;
}
