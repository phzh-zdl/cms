// Loeschen nach Regeln: rein, ohne Mutation. Die Regeln stehen in der cms.json
// an der Sammlung, auf die verwiesen wird (onDelete).
import { contentPath } from './site.js';

const MODES = ['reassign', 'remove', 'nullify'];
const keyOf = (collection) => collection.key ?? 'id';
const byId = (config, id) => config.collections.find((c) => c.id === id);

function rulesFor(config, collectionId) {
  const collection = byId(config, collectionId);
  return (collection?.onDelete ?? []).map((rule) => {
    if (!MODES.includes(rule.mode)) {
      throw new Error(`Unbekannte Löschregel „${rule.mode}“ in ${collectionId}.`);
    }
    const [refCollection, field] = String(rule.referencedBy).split('.');
    return { mode: rule.mode, refCollection, field };
  });
}

const references = (value, id) => (Array.isArray(value) ? value.includes(id) : value === id);

function affectedBy(data, config, rule, id) {
  const refKey = keyOf(byId(config, rule.refCollection));
  return (data[rule.refCollection] ?? [])
    .filter((row) => references(row[rule.field], id))
    .map((row) => row[refKey]);
}

// Strengste Regel mit Betroffenen gewinnt: reassign > remove > nullify.
export function planDelete(data, config, collectionId, id) {
  const hits = rulesFor(config, collectionId)
    .map((rule) => ({ rule, affected: [...new Set(affectedBy(data, config, rule, id))] }))
    .filter((h) => h.affected.length > 0);
  for (const mode of MODES) {
    const hit = hits.find((h) => h.rule.mode === mode);
    if (hit) return { mode, affected: hit.affected };
  }
  return { mode: 'free', affected: [] };
}

export function applyDelete(data, config, collectionId, id, { reassignTo } = {}) {
  const collection = byId(config, collectionId);
  const key = keyOf(collection);
  const rules = rulesFor(config, collectionId);
  const next = { ...data };

  if (rules.some((r) => r.mode === 'reassign' && affectedBy(data, config, r, id).length > 0)) {
    const valid = reassignTo !== id && (data[collectionId] ?? []).some((row) => row[key] === reassignTo);
    if (!valid) throw new Error('Bitte ein gültiges Ziel für das Verschieben wählen.');
  }

  for (const { mode, refCollection, field } of rules) {
    next[refCollection] = (next[refCollection] ?? data[refCollection] ?? []).map((row) => {
      if (!references(row[field], id)) return row;
      if (mode === 'reassign') return { ...row, [field]: reassignTo };
      if (mode === 'remove') return { ...row, [field]: row[field].filter((v) => v !== id) };
      return { ...row, [field]: null };
    });
  }

  const entry = (data[collectionId] ?? []).find((row) => row[key] === id);
  next[collectionId] = (next[collectionId] ?? data[collectionId] ?? []).filter((row) => row[key] !== id);

  const removedFiles = (collection.fields ?? [])
    .filter((f) => f.type === 'image' && entry?.[f.name])
    .map((f) => contentPath(config, `${f.dir}/${entry[f.name]}`));

  return { data: next, removedFiles };
}
