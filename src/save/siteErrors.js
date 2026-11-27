// Welche Teile einer Seite verhindern das Speichern? Gleiche Pruefung vor dem Speichern
// (SiteEditor) und nach dem Zusammenfuehren mit dem Stand einer anderen Person (useConflictSave).
import { collectionErrors } from '../editor/entryState.js';
import { settingsErrors } from '../content/settingsValue.js';

// originalData = Daten der Basis (fuer "neu"). Liefert die Sammlungs-/Einstellungs-Definitionen mit Fehlern.
export function invalidParts(config, data, settings = {}, originalData) {
  const collections = config.collections.filter((c) =>
    Object.keys(collectionErrors(c, data[c.id] ?? [], { data, collections: config.collections, original: originalData })).length > 0);
  // Einstellungen nur pruefen, wenn sie geschrieben werden (vorhanden oder geaendert), nicht die Standardwerte.
  const own = (config.settings ?? []).filter((st) =>
    settings[st.name] !== undefined && Object.keys(settingsErrors(st, settings[st.name])).length > 0);
  return [...collections, ...own];
}
