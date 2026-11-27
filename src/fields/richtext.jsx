import RichTextField from './RichTextField.jsx';

export const validate = () => null;

// Feld vom Typ richtext (Toolbar aus field.toolbar, sonst basic).
export function Editor({ field, value, onChange, error }) {
  return <RichTextField label={field.label} value={value ?? ''} onChange={onChange} toolbar={field.toolbar ?? 'basic'} error={error} />;
}

export default { Editor, validate, empty: '' };
