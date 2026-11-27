import FixedField from './FixedField.jsx';
import { requiredCheck } from './rules.js';

export const validate = (value, field) => {
  const r = requiredCheck(value, field);
  return r === undefined ? null : r;
};

export const HINT_UUID = 'Wird automatisch vergeben und kann nicht geändert werden.';

export function Editor({ field, value, error }) {
  return <FixedField field={field} value={value} hint={HINT_UUID} error={error} />;
}

export default { Editor, validate, empty: '' };
