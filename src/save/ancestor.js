// Vergleichsbasis fuer Aenderungen, die waehrend eines Speichervorgangs gemacht wurden (rein).
//
// Beim Zusammenfuehren wird der Arbeitsstand vom Klick ("from") mit dem Stand der anderen
// verrechnet ("merged"). Was danach noch bearbeitet wurde ("cur"), ist nicht gespeichert und kennt
// die Aenderungen der anderen nicht. Fuer genau diese Eintraege bleibt die Fassung vom Klick die
// Vergleichsbasis des naechsten Speicherns (ancestor) - so fragt es nach, statt still zu
// ueberschreiben. Alle anderen Eintraege bekommen den zusammengefuehrten Stand als Basis.
// ancestor = null | { data: { [Sammlung]: Zeilen }, pages: { [Seite]: Seite }, settings?: { [Name]: Objekt } }
import { mergeCollections, applyChoices, keysUsable, sameValue } from './merge.js';

const byKey = (rows, key) => new Map((rows ?? []).map((r) => [r[key], r]));
const usable = (key, ...lists) => lists.every((rows) => keysUsable(rows, key));

// Arbeitsstand: zusammengefuehrt, meine neueren Aenderungen gehen vor.
function preferMine(f, k, m, collectionId, key) {
  const r = mergeCollections(f, k, m, key);
  const conflicts = r.conflicts.map((x) => ({ kind: 'collection', collectionId, ...x }));
  return applyChoices({ data: { [collectionId]: r.merged }, pages: {}, conflicts, keys: { [collectionId]: key } },
    conflicts.map(() => 'mine')).data[collectionId];
}

// Basis pro Eintrag: nach dem Klick geaendert/geloescht -> Fassung vom Klick, sonst die zusammengefuehrte.
function entryAncestor(f, k, m, key) {
  const fm = byKey(f, key);
  const km = byKey(k, key);
  const touched = (id) => !sameValue(fm.get(id), km.get(id));
  const rows = [];
  const inMerged = new Set();
  for (const row of m ?? []) {
    inMerged.add(row[key]);
    const v = touched(row[key]) ? fm.get(row[key]) : row;
    if (v) rows.push(v);
  }
  for (const row of f ?? []) if (!inMerged.has(row[key]) && touched(row[key])) rows.push(row);
  return rows;
}

// from/cur/merged: { data, pages, settings }. Liefert { data, pages, settings?, ancestor }.
export function rebaseState(config, from, cur, merged) {
  const ancestor = { data: {}, pages: {} };
  let touched = false;
  let data = merged.data;
  if (cur.data !== from.data) {
    data = { ...merged.data };
    for (const c of config.collections) {
      const [f, k, m] = [from.data?.[c.id], cur.data?.[c.id], merged.data?.[c.id]];
      if (f === k || sameValue(f, k)) continue;
      touched = true;
      const key = c.key ?? 'id';
      if (usable(key, f, k, m)) {
        data[c.id] = preferMine(f, k, m, c.id, key);
        ancestor.data[c.id] = entryAncestor(f, k, m, key);
      } else {
        // Ohne eindeutige Kennungen: ganze Datei. Das naechste Speichern fuehrt sie dann
        // nicht zusammen, sondern meldet es (UnmergeableError) - nichts geht still verloren.
        data[c.id] = k;
        ancestor.data[c.id] = f;
      }
    }
  }
  // Textseiten und Einstellungen: je ein Eintrag; nach dem Klick geaendert -> neuere Fassung, Basis = vom Klick.
  const single = {};
  for (const { part, ids } of singleParts(config)) {
    if (part === 'settings') ancestor.settings = {};
    single[part] = merged[part];
    if (cur[part] === from[part]) continue;
    single[part] = { ...merged[part] };
    for (const id of ids) {
      const [f, k] = [from[part]?.[id], cur[part]?.[id]];
      if (f === k || sameValue(f, k)) continue;
      touched = true;
      ancestor[part][id] = f;
      single[part][id] = k;
    }
  }
  return { data, pages: single.pages, settings: single.settings ?? merged.settings, ancestor: touched ? ancestor : null };
}

// Teile mit Einzelobjekten: pages immer, settings nur, wenn die Seite welche hat.
function singleParts(config) {
  const parts = [{ part: 'pages', ids: config.pages.map((p) => p.id) }];
  if ((config.settings ?? []).length > 0) parts.push({ part: 'settings', ids: config.settings.map((s) => s.name) });
  return parts;
}

// Nach dem Speichern (saved = gespeicherter Stand, work = aktueller Arbeitsstand): Basis nur noch
// fuer Eintraege/Seiten behalten, deren neuere Aenderung weiterhin ungespeichert ist und deren
// Basis sich vom Gespeicherten unterscheidet. Liefert ancestor oder null.
export function pruneAncestor(config, ancestor, saved, work) {
  if (!ancestor) return null;
  const out = { data: {}, pages: {} };
  let any = false;
  for (const c of config.collections) {
    const a = ancestor.data?.[c.id];
    if (a === undefined) continue;
    const [s, w] = [saved.data?.[c.id], work.data?.[c.id]];
    const key = c.key ?? 'id';
    let rows = a;
    if (usable(key, a, s, w)) {
      const am = byKey(a, key);
      const sm = byKey(s, key);
      const wm = byKey(w, key);
      rows = [];
      for (const row of s ?? []) {
        const v = sameValue(wm.get(row[key]), row) ? row : am.get(row[key]);
        if (v) rows.push(v);
      }
      for (const row of a) if (!sm.has(row[key]) && wm.has(row[key])) rows.push(row);
    } else if (sameValue(w, s)) {
      continue;
    }
    if (sameValue(rows, s)) continue;
    out.data[c.id] = rows;
    any = true;
  }
  for (const { part, ids } of singleParts(config)) {
    if (part === 'settings') out.settings = {};
    for (const id of ids) {
      if (!ancestor[part] || !(id in ancestor[part])) continue;
      const a = ancestor[part][id];
      const s = saved[part]?.[id];
      if (sameValue(work[part]?.[id], s) || sameValue(a, s)) continue;
      out[part][id] = a;
      any = true;
    }
  }
  return any ? out : null;
}
