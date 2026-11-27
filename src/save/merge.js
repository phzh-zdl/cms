// Drei-Wege-Zusammenfuehrung: base = Stand, auf dem meine Aenderungen aufbauen,
// mine = mein Arbeitsstand, theirs = was inzwischen gespeichert wurde. Rein, ohne Seiteneffekte.

// Stabile Darstellung: Objektschluessel sortiert, damit die Feldreihenfolge keinen Unterschied macht.
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable(value[k])]));
  }
  return value;
}
export const sameValue = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

// Lassen sich die Eintraege eindeutig ueber ihre Kennung zuordnen? (keine fehlende, keine doppelte)
export function keysUsable(rows, key = 'id') {
  if (rows === undefined) return true;
  if (!Array.isArray(rows)) return false;
  const seen = new Set();
  for (const r of rows) {
    const k = r && typeof r === 'object' ? r[key] : undefined;
    if (k === undefined || k === null || k === '' || seen.has(k)) return false;
    seen.add(k);
  }
  return true;
}

// Beide Seiten haben eine Datei geaendert, deren Eintraege sich nicht eindeutig zuordnen lassen.
export class UnmergeableError extends Error {
  constructor(label) {
    super(`Die Datei „${label}“ enthält Einträge ohne eindeutige Kennung und kann nicht automatisch zusammengeführt werden.`);
    this.name = 'UnmergeableError';
    this.label = label;
  }
}

// Ergebnis fuer einen Eintrag/eine Seite: { value } oder { conflict: true }. undefined = nicht vorhanden.
// Gleich (auch nur bis auf die Feldreihenfolge): die Fassung der anderen, damit nichts unnoetig neu geschrieben wird.
function pick(base, mine, theirs) {
  if (sameValue(mine, theirs)) return { value: theirs };
  if (sameValue(mine, base)) return { value: theirs };
  if (sameValue(theirs, base)) return { value: mine };
  return { conflict: true };
}

// merged enthaelt fuer einen Konflikt vorlaeufig die andere Fassung (bzw. meine, wenn die andere
// geloescht ist); applyChoices ersetzt sie. Reihenfolge wie theirs, eigene neue Eintraege angehaengt.
export function mergeCollections(base = [], mine = [], theirs = [], key = 'id') {
  const index = (rows) => new Map(rows.map((r) => [r[key], r]));
  const b = index(base);
  const m = index(mine);
  const t = index(theirs);
  const merged = [];
  const conflicts = [];
  const handle = (id) => {
    const r = pick(b.get(id), m.get(id), t.get(id));
    if (r.conflict) {
      conflicts.push({ id, mine: m.get(id) ?? null, theirs: t.get(id) ?? null });
      merged.push(t.get(id) ?? m.get(id));
    } else if (r.value !== undefined) {
      merged.push(r.value);
    }
  };
  for (const row of theirs) handle(row[key]);
  for (const row of mine) if (!t.has(row[key])) handle(row[key]);
  return { merged, conflicts };
}

// Eine Textseite ist ein einziger Eintrag.
export function mergePage(base, mine, theirs) {
  const r = pick(base, mine, theirs);
  return r.conflict ? { conflict: { mine, theirs } } : { merged: r.value };
}

// Ganze Seite: alle Sammlungen, Textseiten und Einstellungen. Liefert { data, pages, settings, conflicts, keys }.
// Je Datei zuerst als Ganzes: hat nur eine Seite sie geaendert, gilt deren Fassung unveraendert
// (auch Reihenfolge und Eintraege ohne Kennung). Nur wenn beide sie geaendert haben, wird je
// Eintrag zusammengefuehrt - das setzt eindeutige Kennungen voraus (sonst UnmergeableError).
// conflicts: { kind: 'collection', collectionId, id, mine, theirs } | { kind: 'page', pageId, mine, theirs }
//   | { kind: 'settings', settingsId, mine, theirs } (Einstellung = ein Eintrag wie eine Textseite)
export function mergeSite(config, base, mine, theirs) {
  const data = {};
  const pages = {};
  const settings = {};
  const conflicts = [];
  const keys = {};
  for (const c of config.collections) {
    const key = c.key ?? 'id';
    keys[c.id] = key;
    const [b, m, t] = [base.data?.[c.id], mine.data?.[c.id], theirs.data?.[c.id]];
    const whole = pick(b, m, t);
    if (!whole.conflict) {
      if (whole.value !== undefined) data[c.id] = whole.value;
      continue;
    }
    if (![b, m, t].every((rows) => keysUsable(rows, key))) throw new UnmergeableError(c.label ?? c.id);
    const r = mergeCollections(b, m, t, key);
    data[c.id] = r.merged;
    for (const x of r.conflicts) conflicts.push({ kind: 'collection', collectionId: c.id, ...x });
  }
  for (const p of config.pages) {
    const r = mergePage(base.pages?.[p.id], mine.pages?.[p.id], theirs.pages?.[p.id]);
    if (r.conflict) {
      pages[p.id] = r.conflict.theirs;
      conflicts.push({ kind: 'page', pageId: p.id, ...r.conflict });
    } else if (r.merged !== undefined) {
      pages[p.id] = r.merged;
    }
  }
  for (const s of config.settings ?? []) {
    const r = mergePage(base.settings?.[s.name], mine.settings?.[s.name], theirs.settings?.[s.name]);
    if (r.conflict) {
      settings[s.name] = r.conflict.theirs;
      conflicts.push({ kind: 'settings', settingsId: s.name, ...r.conflict });
    } else if (r.merged !== undefined) {
      settings[s.name] = r.merged;
    }
  }
  return { data, pages, settings, conflicts, keys };
}

// choices[i] = 'mine' | 'theirs' fuer conflicts[i]. Liefert { data, pages, settings }.
export function applyChoices(result, choices) {
  const data = { ...result.data };
  const pages = { ...result.pages };
  const settings = { ...result.settings };
  result.conflicts.forEach((conflict, i) => {
    const value = choices[i] === 'mine' ? conflict.mine : conflict.theirs;
    if (conflict.kind === 'page' || conflict.kind === 'settings') {
      const [target, id] = conflict.kind === 'page' ? [pages, conflict.pageId] : [settings, conflict.settingsId];
      if (value === undefined) delete target[id];
      else target[id] = value;
      return;
    }
    const key = result.keys[conflict.collectionId];
    const rows = data[conflict.collectionId].filter((r) => r[key] !== conflict.id);
    if (value) {
      const at = data[conflict.collectionId].findIndex((r) => r[key] === conflict.id);
      rows.splice(at === -1 ? rows.length : at, 0, value);
    }
    data[conflict.collectionId] = rows;
  });
  return { data, pages, settings };
}
