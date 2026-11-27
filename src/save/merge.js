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

// Ergebnis fuer einen Eintrag/eine Seite: { value } oder { conflict: true }. undefined = nicht vorhanden.
function pick(base, mine, theirs) {
  if (sameValue(mine, theirs)) return { value: mine };
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

// Ganze Seite: alle Sammlungen und Textseiten. Liefert { data, pages, conflicts, keys }.
// conflicts: { kind: 'collection', collectionId, id, mine, theirs } | { kind: 'page', pageId, mine, theirs }
export function mergeSite(config, base, mine, theirs) {
  const data = {};
  const pages = {};
  const conflicts = [];
  const keys = {};
  for (const c of config.collections) {
    const key = c.key ?? 'id';
    keys[c.id] = key;
    const r = mergeCollections(base.data?.[c.id], mine.data?.[c.id], theirs.data?.[c.id], key);
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
  return { data, pages, conflicts, keys };
}

// choices[i] = 'mine' | 'theirs' fuer conflicts[i]. Liefert { data, pages }.
export function applyChoices(result, choices) {
  const data = { ...result.data };
  const pages = { ...result.pages };
  result.conflicts.forEach((conflict, i) => {
    const value = choices[i] === 'mine' ? conflict.mine : conflict.theirs;
    if (conflict.kind === 'page') {
      if (value === undefined) delete pages[conflict.pageId];
      else pages[conflict.pageId] = value;
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
  return { data, pages };
}
