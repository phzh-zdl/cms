// Einstellungsobjekt (settings in cms.json): ein einzelnes Objekt mit festen Feldern (rein).
import { fieldTypes, validateEntry } from '../fields/registry.js';

// Alle konfigurierten Felder in Konfigurationsreihenfolge: gespeicherter Wert, sonst default, sonst Leerwert.
// Ein boolean ist immer true/false (nie null/undefined) - der Katalog prueft das so.
export function settingsValue(def, stored) {
  const src = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  const out = {};
  for (const f of def.fields) {
    const v = src[f.name] !== undefined ? src[f.name] : (f.default !== undefined ? f.default : fieldTypes[f.type].empty);
    out[f.name] = f.type === 'boolean' ? v === true : v;
  }
  return out;
}

// Einstellungen, die eigenstaendig in der Seitenleiste stehen (nicht von einer Ansicht gezeigt).
export const standaloneSettings = (config) =>
  (config.settings ?? []).filter((s) => !(config.views ?? []).some((v) => v.settings === s.name));

// Meldungen je Feldname (leer = gueltig), mit denselben Regeln wie die Formularfelder.
export const settingsErrors = (def, stored) => validateEntry(def.fields, settingsValue(def, stored), { data: {}, collections: [] });
