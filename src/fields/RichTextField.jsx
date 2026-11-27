import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { Details, DetailsSummary, DetailsContent } from '@tiptap/extension-details';
import { sanitizeHtml } from '../richtext/sanitize.js';
import { toEditorHtml } from '../richtext/editorHtml.js';
import Toolbar from '../richtext/Toolbar.jsx';
import LinkForm from '../richtext/LinkForm.jsx';
import PageLinkForm from '../richtext/PageLinkForm.jsx';

// Nur die Bausteine der Allowlist: p h2-h4 strong em ul ol li a table details br. Alles andere
// (Bilder, Code, Zitate, Linie, Durchgestrichen, Unterstrichen) ist im Schema gar nicht vorhanden.
// Tabellen, Abschnitte und H4 sind in jedem Editor im Schema, damit sie beim Bearbeiten nie still
// verloren gehen; die Toolbar steuert nur, welche Knoepfe sichtbar sind.
const EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    blockquote: false, codeBlock: false, code: false, horizontalRule: false,
    strike: false, underline: false, link: false,
  }),
  Link.configure({ openOnClick: false, autolink: false, linkOnPaste: false, HTMLAttributes: { rel: null, target: null } }),
  Table.configure({ resizable: false }), TableRow, TableHeader, TableCell,
  Details.configure({ persist: false }), DetailsSummary, DetailsContent,
];

// Formatierter Text; gibt bei jeder Aenderung bereinigtes HTML aus.
export default function RichTextField({ label, value, onChange, toolbar = 'basic', pageIds = [], error }) {
  const [dialog, setDialog] = useState(null); // null | 'link' | 'page'
  const lastEmitted = useRef(value ?? '');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: EXTENSIONS,
    content: toEditorHtml(value),
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': label ?? 'Text', class: 'rt-content' },
    },
    onUpdate: ({ editor: ed }) => {
      const html = sanitizeHtml(ed.getHTML());
      lastEmitted.current = html;
      onChangeRef.current(html);
    },
  }, [toolbar]);

  // Aenderungen von aussen (z.B. Entwurf wiederhergestellt) in den Editor uebernehmen.
  useEffect(() => {
    if (editor && (value ?? '') !== lastEmitted.current) {
      lastEmitted.current = value ?? '';
      editor.commands.setContent(toEditorHtml(value), { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  const closeDialog = () => { setDialog(null); editor.chain().focus().run(); };
  const applyLink = (href) => {
    const chain = editor.chain().focus();
    if (editor.state.selection.empty && !editor.isActive('link')) {
      chain.insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] }).run();
    } else {
      chain.extendMarkRange('link').setLink({ href }).run();
    }
    setDialog(null);
  };

  return (
    <div className="field rt-field">
      <p className="field-label">{label}</p>
      <Toolbar editor={editor} toolbar={toolbar} onLink={() => setDialog('link')} onPageLink={() => setDialog('page')} />
      {dialog === 'link' && (
        <LinkForm initial={editor.getAttributes('link').href ?? ''} onSubmit={applyLink} onCancel={closeDialog}
          onRemove={() => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); setDialog(null); }} />
      )}
      {dialog === 'page' && <PageLinkForm pageIds={pageIds} onSubmit={applyLink} onCancel={closeDialog} />}
      <EditorContent editor={editor} />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
