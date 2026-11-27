import { fieldTypes } from '../fields/registry.js';
import { settingsValue, settingsErrors } from '../content/settingsValue.js';

// Formular fuer ein Einstellungsobjekt (settings in cms.json). stored = Arbeitsstand oder undefined
// (Datei fehlt / unberuehrt -> Standardwerte). onChange erhaelt immer das vollstaendige Objekt
// mit allen konfigurierten Feldern, damit die Datei beim Speichern vollstaendig geschrieben wird.
export default function SettingsForm({ def, stored, onChange }) {
  const value = settingsValue(def, stored);
  const errors = settingsErrors(def, stored);
  return (
    <div className="settings-form">
      {def.fields.map((field) => {
        const { Editor } = fieldTypes[field.type];
        return (
          <Editor key={field.name} field={field} ctx={{ data: {}, collections: [] }} error={errors[field.name]}
            value={value[field.name]} onChange={(v) => onChange({ ...value, [field.name]: v })} />
        );
      })}
    </div>
  );
}
