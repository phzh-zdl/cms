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

// Volle Repo-Pfade aller Bilder, die der Arbeitsstand noch verwendet (Bildfelder aller Sammlungen).
export function referencedFiles(config, data) {
  const out = new Set();
  for (const c of config.collections) {
    const imageFields = (c.fields ?? []).filter((f) => f.type === 'image');
    if (imageFields.length === 0) continue;
    for (const row of data?.[c.id] ?? []) {
      for (const f of imageFields) {
        if (typeof row?.[f.name] === 'string' && row[f.name]) out.add(contentPath(config, `${f.dir}/${row[f.name]}`));
      }
    }
  }
  return out;
}

// Zu loeschende Dateien ohne die, die noch verwendet werden (z. B. nach dem Zusammenfuehren
// "Die andere Version" mit dem alten Bild, oder ein Dateiname, den zwei Eintraege teilen).
export const stillRemoved = (config, data, removedFiles = []) => {
  const used = referencedFiles(config, data);
  return [...new Set(removedFiles)].filter((p) => !used.has(p));
};

// site: { config, original: { [Repo-Pfad]: Text } } (die Basis, gegen die verglichen wird).
// settings: { [Name]: Objekt } - undefined = unberuehrt (eine fehlende Datei bleibt dann fehlend).
// Liefert { path, text } | { path, bytes } | { path, delete: true } - nur echte Aenderungen.
export function collectChanges(site, data, pages, newImages = [], removedFiles = [], settings = {}) {
  const { config, original } = site;
  const out = [];
  const textFile = (file, value) => {
    if (value === undefined) return;
    const path = contentPath(config, file);
    if (!unchanged(value, original[path])) out.push({ path, text: serializeJson(value) });
  };
  for (const c of config.collections) textFile(c.file, data[c.id]);
  for (const p of config.pages) textFile(p.file, pages?.[p.id]);
  for (const st of config.settings ?? []) textFile(st.file, settings?.[st.name]);
  for (const img of newImages) out.push({ path: img.path, bytes: img.bytes });
  const written = new Set(out.map((c) => c.path));
  for (const path of stillRemoved(config, data, removedFiles)) {
    if (!written.has(path)) out.push({ path, delete: true });
  }
  return out;
}
