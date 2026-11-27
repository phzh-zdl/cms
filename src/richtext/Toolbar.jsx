// Werkzeugleiste: echte Buttons mit Beschriftung; Umschalter melden ihren Zustand per aria-pressed.
function Btn({ label, text, active, onClick }) {
  return (
    <button type="button" aria-label={label} aria-pressed={active === undefined ? undefined : String(active)} onClick={onClick}>
      {text}
    </button>
  );
}

export default function Toolbar({ editor, toolbar, onLink, onPageLink }) {
  const full = toolbar === 'full';
  const chain = () => editor.chain().focus();
  const heading = (level) => (
    <Btn key={level} label={`Zwischentitel ${level}`} text={`H${level}`} active={editor.isActive('heading', { level })}
      onClick={() => chain().toggleHeading({ level }).run()} />
  );
  return (
    <div className="rt-toolbar" role="toolbar" aria-label="Textformatierung">
      <Btn label="Absatz" text="¶" active={editor.isActive('paragraph')} onClick={() => chain().setParagraph().run()} />
      {heading(2)}
      {heading(3)}
      {full && heading(4)}
      <Btn label="Fett" text="B" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()} />
      <Btn label="Kursiv" text="I" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()} />
      <Btn label="Aufzählung" text="• Liste" active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()} />
      <Btn label="Nummerierte Liste" text="1. Liste" active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()} />
      <Btn label="Link" text="Link" active={editor.isActive('link')} onClick={onLink} />
      {full && (
        <>
          <Btn label="Tabelle einfügen" text="Tabelle"
            onClick={() => chain().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()} />
          <Btn label="Aufklappbarer Abschnitt" text="Aufklappbar" active={editor.isActive('details')}
            onClick={() => (editor.isActive('details') ? chain().unsetDetails().run() : chain().setDetails().run())} />
          <Btn label="Link auf andere Seite" text="Seitenlink" onClick={onPageLink} />
        </>
      )}
    </div>
  );
}
