import { useEffect, useRef, useState } from 'react';
import { contentPath } from '../content/site.js';
import CollectionView from '../editor/CollectionView.jsx';
import SaveBar from '../editor/SaveBar.jsx';
import { planDelete, applyDelete } from '../content/deleteRules.js';
import { collectionErrors } from '../editor/entryState.js';
import ConflictDialog from '../editor/ConflictDialog.jsx';
import PageEditor from '../editor/PageEditor.jsx';
import { AuthError, GitHubError } from '../github/client.js';
import { useSiteWorkingCopy } from '../save/useSiteWorkingCopy.js';
import { useDraftAutosave } from '../save/useDraftAutosave.js';
import { loadDraft, clearDraft, settleDraftAfterSave } from '../save/drafts.js';
import { useConflictSave, MSG_BUSY, MSG_CANCELLED } from '../save/useConflictSave.js';
import { UnmergeableError } from '../save/merge.js';
import ExportPanel from './ExportPanel.jsx';
import HistoryPanel from './HistoryPanel.jsx';

const DRAFT_OK = 'Ihre Änderungen sind als Entwurf gesichert.';
const DRAFT_FAILED = 'Ihre Änderungen konnten nicht als Entwurf gesichert werden – bitte diese Seite nicht schliessen.';
const MSG_AUTH = 'Ihr Zugangsschlüssel ist abgelaufen oder ungültig.';

const draftDate = (iso) => new Date(iso).toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' });

// drafted = ob der Entwurf vor dem Speichern wirklich gesichert werden konnte.
function errorText(e, drafted) {
  const draftNote = drafted ? DRAFT_OK : DRAFT_FAILED;
  if (e instanceof AuthError) return `${MSG_AUTH} ${draftNote}`;
  if (e instanceof UnmergeableError) return `${e.message} ${draftNote}`;
  if (e instanceof GitHubError) return drafted ? e.message : `${e.message} ${DRAFT_FAILED}`;
  return `Speichern fehlgeschlagen. ${draftNote}`;
}

// Seitenleiste + Hauptbereich. Arbeitsstand und Basis liegen in useSiteWorkingCopy.
export default function SiteEditor({ site, client, onBack }) {
  const { config } = site;
  const wc = useSiteWorkingCopy(site);
  const { base, data, setData, pages, removedFiles, newImages, dirty } = wc;
  const [pendingDraft, setPendingDraft] = useState(() => loadDraft(site.repo));
  const autosave = useDraftAutosave(site.repo, wc, !pendingDraft);
  const conflictSave = useConflictSave(site, client, wc);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [blockRequested, setBlockRequested] = useState(false);
  // Neuester Arbeitsstand und ob der Editor noch offen ist - fuer das Ende eines Speichervorgangs.
  const latest = useRef();
  latest.current = { data, pages, removedFiles, newImages };
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [current, setCurrent] = useState(() =>
    config.collections[0]
      ? { kind: 'collection', id: config.collections[0].id }
      : config.pages[0] ? { kind: 'page', id: config.pages[0].id } : null);

  // Bild-Operationen fuer das Bildfeld (siehe ImageField).
  const images = {
    fullPath: (dir, name) => contentPath(config, `${dir}/${name}`),
    add: (path, bytes) => wc.setNewImages((l) => [...l.filter((i) => i.path !== path), { path, bytes }]),
    discard: (path) => wc.setNewImages((l) => l.filter((i) => i.path !== path)),
    isNew: (path) => latest.current.newImages.some((i) => i.path === path),
    markRemoved: (path) => wc.setRemovedFiles((l) => [...new Set([...l, path])]),
    async preview(path) {
      const fresh = latest.current.newImages.find((i) => i.path === path);
      const bytes = fresh ? fresh.bytes : await client.getFileBytes(site.repo, path, base.headSha);
      return bytes ? URL.createObjectURL(new Blob([bytes], { type: 'image/webp' })) : null;
    },
  };

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
    const drafted = autosave.flush(); // Entwurf zuerst sichern - bleibt bei jedem Fehler erhalten
    const work = { data, pages, newImages, removedFiles };
    setSaving(true);
    let outcome;
    try {
      outcome = await conflictSave.save(work);
    } catch (e) {
      if (mounted.current) {
        setResult({ kind: 'error', text: errorText(e, drafted) });
        setSaving(false);
      }
      return;
    }
    if (outcome.status !== 'saved') {
      if (mounted.current) {
        setResult(outcome.status === 'cancelled'
          ? { kind: 'info', text: MSG_CANCELLED }
          : { kind: 'error', text: drafted ? MSG_BUSY : `${MSG_BUSY} ${DRAFT_FAILED}` });
        setSaving(false);
      }
      return;
    }
    const { sha, snapshot, baseSha } = outcome;
    if (!mounted.current) {
      // Editor wurde waehrend des Speicherns verlassen: Entwurf nur loeschen, wenn er nichts Neueres enthaelt.
      settleDraftAfterSave(site.repo, snapshot, baseSha, sha);
      return;
    }
    wc.markSaved(sha, snapshot);
    const l = latest.current;
    const now = wc.peek(); // sofort aktuell, auch wenn nach dem Zusammenfuehren noch nicht neu gezeichnet
    const untouched = now.data === snapshot.data && now.pages === snapshot.pages
      && l.removedFiles === snapshot.removedFiles && l.newImages === snapshot.newImages;
    // Wurde waehrend des Speicherns weiter bearbeitet, sichert die Autosave-Logik den neuen Stand.
    if (untouched) clearDraft(site.repo);
    setResult({ kind: 'success', text: 'Gespeichert.' });
    setSaving(false);
  }

  const item = current && (current.kind === 'collection'
    ? config.collections.find((c) => c.id === current.id)
    : config.pages.find((p) => p.id === current.id));

  const navButton = (kind, entry) => {
    const active = current?.kind === kind && current.id === entry.id;
    return (
      <li key={`${kind}:${entry.id}`}>
        <button type="button" className="nav-item" aria-current={active ? 'page' : undefined} onClick={() => setCurrent({ kind, id: entry.id })}>
          {entry.label}
        </button>
      </li>
    );
  };

  if (pendingDraft) {
    return (
      <section className="draft-prompt">
        <p>Es gibt ungespeicherte Änderungen vom {draftDate(pendingDraft.savedAt)}. Wiederherstellen?</p>
        <div className="actions">
          <button type="button" className="btn-primary" onClick={() => {
            wc.restore(pendingDraft);
            if (pendingDraft.baseSha && pendingDraft.baseSha !== site.headSha) conflictSave.announce();
            setPendingDraft(null);
          }}>Wiederherstellen</button>
          <button type="button" onClick={() => { clearDraft(site.repo); setPendingDraft(null); }}>Verwerfen</button>
        </div>
      </section>
    );
  }

  return (
    <div className="editor">
      <aside className="editor-side">
        <button type="button" className="btn-ghost back-to-sites" onClick={onBack}>Zurück zur Seitenauswahl</button>
        {/* Seitenname steht in der App-Leiste. Gruppen: Inhalte, Textseiten, abgesetzt Veröffentlichen. */}
        <nav aria-label="Inhalte" className="side-nav">
          {config.collections.length > 0 && (
            <div className="nav-group">
              <h2 className="nav-heading" id="nav-inhalte">Inhalte</h2>
              <ul aria-labelledby="nav-inhalte">{config.collections.map((c) => navButton('collection', c))}</ul>
            </div>
          )}
          {config.pages.length > 0 && (
            <div className="nav-group">
              <h2 className="nav-heading" id="nav-textseiten">Textseiten</h2>
              <ul aria-labelledby="nav-textseiten">{config.pages.map((p) => navButton('page', p))}</ul>
            </div>
          )}
          <div className="nav-group nav-group-publish">
            <h2 className="nav-heading" id="nav-veroeffentlichen">Veröffentlichen</h2>
            <ul aria-labelledby="nav-veroeffentlichen">
              <li>
                <button type="button" className="nav-item" aria-current={current?.kind === 'export' ? 'page' : undefined}
                  onClick={() => setCurrent({ kind: 'export' })}>Exportieren</button>
              </li>
              <li>
                <button type="button" className="nav-item" aria-current={current?.kind === 'history' ? 'page' : undefined}
                  onClick={() => setCurrent({ kind: 'history' })}>Verlauf</button>
              </li>
            </ul>
          </div>
        </nav>
      </aside>
      <section className="editor-main">
        {conflictSave.notice && <p role="status" className="note">{conflictSave.notice}</p>}
        {conflictSave.dialog && <ConflictDialog {...conflictSave.dialog} />}
        {current?.kind === 'collection' && item && (
          <CollectionView key={item.id} collection={item} data={data} original={base.data}
            collections={config.collections} images={images}
            planFor={(id) => planDelete(data, config, item.id, id)}
            onDelete={(id, opts) => {
              const res = applyDelete(data, config, item.id, id, opts);
              setData(res.data);
              wc.setRemovedFiles((files) => [...new Set([...files, ...res.removedFiles])]);
            }}
            onChange={(rows) => setData((d) => ({ ...d, [item.id]: rows }))} />
        )}
        {current?.kind === 'export' && <ExportPanel site={site} client={client} dirty={unsaved} />}
        {current?.kind === 'history' && <HistoryPanel site={site} client={client} />}
        {current?.kind === 'page' && item && (
          <div className="page-view">
            <h1>{item.label}</h1>
            <PageEditor key={item.id} toolbar={item.toolbar}
              pageIds={config.pages.filter((p) => p.id !== item.id).map((p) => p.id)}
              page={pages[item.id] ?? { id: item.id, title: item.label, html: '' }}
              onChange={(next) => wc.setPages((all) => ({ ...all, [item.id]: next }))} />
          </div>
        )}
        {/* Speicherleiste am Ende des Inhalts, per CSS am unteren Rand angeheftet (sticky). */}
        <SaveBar dirty={dirty} saving={saving} onSave={handleSave} result={result} blocked={blocked}
          draftFailed={autosave.failed} />
      </section>
    </div>
  );
}
