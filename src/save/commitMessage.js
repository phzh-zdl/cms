// Lesbare Beschreibung einer Speicherung, z. B. „Ressource „A“ geändert, 1 Bild hinzugefügt“.
import { keyOf } from '../editor/entryState.js';

const SINGULAR = {
  Ressourcen: 'Ressource',
  Fachbereiche: 'Fachbereich',
  Formate: 'Format',
  Zielstufen: 'Zielstufe',
  Lizenzen: 'Lizenz',
};
const MAX_LISTED = 3;

export function buildCommitMessage(summary, imageCount = 0) {
  const parts = summary.length > MAX_LISTED
    ? [`${summary.length} Einträge geändert`]
    : summary.map(({ label, verb, title }) => `${label} „${title}“ ${verb}`);
  if (imageCount > 0) parts.push(imageCount === 1 ? '1 Bild hinzugefügt' : `${imageCount} Bilder hinzugefügt`);
  return parts.length > 0 ? parts.join(', ') : 'Inhalte aktualisiert';
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Vergleicht Basis und Arbeitsstand je Eintrag (ueber die Kennung) und je Textseite.
export function summarizeChanges(config, baseData, data, basePages = {}, pages = {}) {
  const out = [];
  for (const c of config.collections) {
    const key = keyOf(c);
    const label = SINGULAR[c.label] ?? c.label;
    const title = (row) => String(row[c.titleField] ?? '').trim() || String(row[key]);
    const before = baseData?.[c.id] ?? [];
    const after = data?.[c.id] ?? [];
    const beforeById = new Map(before.map((r) => [r[key], r]));
    const afterIds = new Set(after.map((r) => r[key]));
    const added = [];
    const changed = [];
    for (const row of after) {
      const old = beforeById.get(row[key]);
      if (!old) added.push({ label, verb: 'hinzugefügt', title: title(row) });
      else if (!same(old, row)) changed.push({ label, verb: 'geändert', title: title(row) });
    }
    const deleted = before.filter((r) => !afterIds.has(r[key]))
      .map((r) => ({ label, verb: 'gelöscht', title: title(r) }));
    out.push(...added, ...deleted, ...changed);
  }
  for (const p of config.pages) {
    if (pages?.[p.id] !== undefined && !same(basePages?.[p.id], pages[p.id])) {
      out.push({ label: 'Seite', verb: 'geändert', title: p.label });
    }
  }
  return out;
}
