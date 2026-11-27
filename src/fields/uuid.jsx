import FieldFrame, { aria } from './FieldFrame.jsx';
import { requiredCheck } from './rules.js';

export const validate = (value, field) => {
  const r = requiredCheck(value, field);
  return r === undefined ? null : r;
};

export function Editor({ field, value, error }) {
  return (
    <FieldFrame field={field} error={error}>
      <input type="text" {...aria(field, error)} value={value ?? ''} readOnly />
    </FieldFrame>
  );
}

export default { Editor, validate, empty: '' };
