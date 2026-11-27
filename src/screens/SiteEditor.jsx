import { useEffect, useState } from 'react';
import CollectionView from '../editor/CollectionView.jsx';
import SaveBar from '../editor/SaveBar.jsx';
import { planDelete, applyDelete } from '../content/deleteRules.js';
import { collectionErrors } from '../editor/entryState.js';
import { AuthError, ConflictError, GitHubError } from '../github/client.js';
import { useSiteWorkingCopy } from '../save/useSiteWorkingCopy.js';
import { useDraftAutosave } from '../save/useDraftAutosave.js';
import { loadDraft, clearDraft } from '../save/drafts.js';
import { buildCommitMessage, summarizeChanges } from '../save/commitMessage.js';
import { saveChanges } from '../save/saveChanges.js';

const MSG_AUTH = 'Ihr Zugangsschlüssel ist abgelaufen oder ungültig. Ihre Änderungen sind als Entwurf gesichert.';
const MSG_CONFLICT = 'Inzwischen hat jemand anderes gespeichert. Das Zusammenführen folgt in einem späteren Schritt.';

const draftDate = (iso) => new Date(iso).toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' });

function errorText(e) {
  if (e instanceof AuthError) return MSG_AUTH;
  if (e instanceof ConflictError) return MSG_CONFLICT;
  if (e instanceof GitHubError) return e.message;
  return 'Speichern fehlgeschlagen. Ihre Änderungen sind als Entwurf gesichert.';
}

// Seitenleiste + Hauptbereich. Arbeitsstand und Basis liegen in useSiteWorkingCopy.
export default function SiteEditor({ site, client, onBack }) {
  const { config } = site;
  const wc = useSiteWorkingCopy(site);
  const { base, data, setData, pages, removedFiles, newImages, changes, dirty } = wc;
  const [pendingDraft, setPendingDraft] = useState(() => loadDraft(site.repo));
  const autosave = useDraftAutosave(site.repo, wc, !pendingDraft);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [blockRequested, setBlockRequested] = useState(false);
  const [current, setCurrent] = useState(() =>
    config.collections[0]
      ? { kind: 'collection', id: config.collections[0].id }
      : config.pages[0] ? { kind: 'page', id: config.pages[0].id } : null);

  const unsaved = dirty || saving;
  useEffect(() => {
    if (!unsaved) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  const invalidCollections = config.collections.filter((c) =>
    Object.keys(collectionErrors(c, data[c.id] ?? [], { data, collections: config.collections, original: base.data })).length > 0);
  const blocked = blockRequested && invalidCollections.length > 0 ? invalidCollections.map((c) => c.label) : null;

  async function handleSave() {
    setResult(null);
    if (invalidCollections.length > 0) { setBlockRequested(true); return; }
    setBlockRequested(false);
    if (!dirty) { setResult({ kind: 'info', text: 'Es gibt keine Änderungen zum Speichern.' }); return; }
    autosave.flush(); // Entwurf zuerst sichern - bleibt bei jedem Fehler erhalten
    const snapshot = { data, pages, changes, newImages, removedFiles };
    const message = buildCommitMessage(summarizeChanges(config, base.data, data, base.pages, pages), newImages.length);
    setSaving(true);
    try {
      const sha = await saveChanges(client, site.repo, { baseSha: base.headSha, changes, message });
      wc.markSaved(sha, snapshot);
      clearDraft(site.repo);
      setResult({ kind: 'success', text: 'Gespeichert.' });
    } catch (e) {
      setResult({ kind: 'error', text: errorText(e) });
    } finally {
      setSaving(false);
    }
  }

  const item = current && (current.kind === 'collection'
    ? config.collections.find((c) => c.id === current.id)
    : config.pages.find((p) => p.id === current.id));

  const navButton = (kind, entry) => {
    const active = current?.kind === kind && current.id === entry.id;
    return (
      <li key={`${kind}:${entry.id}`}>
        <button type="button" aria-current={active ? 'page' : undefined} onClick={() => setCurrent({ kind, id: entry.id })}>
          {entry.label}
        </button>
      </li>
    );
  };

  if (pendingDraft) {
    return (
      <section className="draft-prompt">
        <p>Es gibt ungespeicherte Änderungen vom {draftDate(pendingDraft.savedAt)}. Wiederherstellen?</p>
        <button type="button" onClick={() => { wc.restore(pendingDraft); setPendingDraft(null); }}>Wiederherstellen</button>
        <button type="button" onClick={() => { clearDraft(site.repo); setPendingDraft(null); }}>Verwerfen</button>
      </section>
    );
  }

  return (
    <div className="editor">
      <aside className="editor-side">
        <button type="button" onClick={onBack}>Zurück zur Seitenauswahl</button>
        <p className="site-name">{config.name}</p>
        <nav aria-label="Inhalte">
          <ul>{config.collections.map((c) => navButton('collection', c))}</ul>
          {config.pages.length > 0 && (
            <>
              <h2>Textseiten</h2>
              <ul>{config.pages.map((p) => navButton('page', p))}</ul>
            </>
          )}
        </nav>
      </aside>
      <section className="editor-main">
        <SaveBar dirty={dirty} saving={saving} onSave={handleSave} result={result} blocked={blocked}
          draftFailed={autosave.failed} />
        {current?.kind === 'collection' && item && (
          <CollectionView key={item.id} collection={item} data={data} original={base.data}
            collections={config.collections}
            planFor={(id) => planDelete(data, config, item.id, id)}
            onDelete={(id, opts) => {
              const res = applyDelete(data, config, item.id, id, opts);
              setData(res.data);
              wc.setRemovedFiles((files) => [...new Set([...files, ...res.removedFiles])]);
            }}
            onChange={(rows) => setData((d) => ({ ...d, [item.id]: rows }))} />
        )}
        {current?.kind === 'page' && item && <h1>{item.label}</h1>}
      </section>
    </div>
  );
}
