// Liest und prueft die cms.json einer Seite. Wirft Error mit deutscher Meldung.

export const FIELD_TYPES = [
  'text', 'textarea', 'slug', 'uuid', 'color', 'url-https', 'boolean',
  'number', 'reference', 'reference-multi', 'image', 'richtext',
];

const fail = (msg) => {
  throw new Error(`cms.json: ${msg}`);
};

const needString = (v, what) => {
  if (typeof v !== 'string' || v === '') fail(`${what} fehlt oder ist kein Text.`);
  return v;
};

function parseField(f, colId) {
  const where = `Sammlung "${colId}"`;
  if (!f || typeof f !== 'object') fail(`${where}: ungueltiges Feld.`);
  const name = needString(f.name, `${where}: Feld-name`);
  if (!FIELD_TYPES.includes(f.type)) {
    fail(`${where}, Feld "${name}": unbekannter Feld-Typ "${f.type}".`);
  }
  const field = { ...f, name, label: f.label ?? name };
  if ((f.type === 'reference' || f.type === 'reference-multi') && !f.to) {
    fail(`${where}, Feld "${name}": ${f.type} braucht ein "to" (Ziel-Sammlung).`);
  }
  return field;
}

export function parseCmsConfig(json) {
  if (!json || typeof json !== 'object') fail('Die Datei enthaelt kein Objekt.');
  const name = needString(json.name, 'name');
  const exp = json.export;
  if (!exp || typeof exp.shell !== 'string' || typeof exp.zipName !== 'string') {
    fail('export.shell und export.zipName fehlen.');
  }
  const contentRoot = needString(json.contentRoot, 'contentRoot');
  if (!Array.isArray(json.collections) || json.collections.length === 0) {
    fail('collections fehlt oder ist leer.');
  }

  const seen = new Set();
  const collections = json.collections.map((c) => {
    const id = needString(c?.id, 'Sammlungs-id');
    if (seen.has(id)) fail(`Sammlung "${id}" ist doppelt vorhanden.`);
    seen.add(id);
    const file = needString(c.file, `Sammlung "${id}": file`);
    const titleField = needString(c.titleField, `Sammlung "${id}": titleField`);
    if (!Array.isArray(c.fields)) fail(`Sammlung "${id}": fields fehlt.`);
    return {
      ...c,
      id,
      label: c.label ?? id,
      file,
      key: c.key ?? 'id',
      titleField,
      sortBy: c.sortBy,
      fields: c.fields.map((f) => parseField(f, id)),
      onDelete: c.onDelete ?? [],
    };
  });

  const byId = Object.fromEntries(collections.map((c) => [c.id, c]));
  for (const c of collections) {
    for (const f of c.fields) {
      if ((f.type === 'reference' || f.type === 'reference-multi') && !byId[f.to]) {
        fail(`Sammlung "${c.id}", Feld "${f.name}": "to" verweist auf unbekannte Sammlung "${f.to}".`);
      }
    }
    for (const d of c.onDelete) {
      const [colId, fieldName] = String(d.referencedBy ?? '').split('.');
      const target = byId[colId];
      if (!target) {
        fail(`Sammlung "${c.id}": onDelete.referencedBy "${d.referencedBy}" verweist auf unbekannte Sammlung "${colId}".`);
      }
      if (!target.fields.some((f) => f.name === fieldName)) {
        fail(`Sammlung "${c.id}": onDelete.referencedBy "${d.referencedBy}" verweist auf unbekanntes Feld "${fieldName}".`);
      }
    }
  }

  const pages = (json.pages ?? []).map((p) => ({
    ...p,
    id: needString(p?.id, 'Seiten-id'),
    file: needString(p.file, `Seite "${p.id}": file`),
    label: p.label ?? p.id,
    toolbar: p.toolbar ?? 'basic',
  }));

  return { name, export: { shell: exp.shell, zipName: exp.zipName }, contentRoot, collections, pages };
}
