import { useMemo, useRef, useState } from 'react';
import { collectChanges } from './serialize.js';
import { imagesFromDraft } from './drafts.js';
import { rebaseState, pruneAncestor } from './ancestor.js';

// Arbeitsstand einer Seite + die Basis (zuletzt geladener/gespeicherter Stand),
// gegen die Aenderungen, "neu" und die Commit-Beschreibung berechnet werden.
// base.headSha = Version, auf der die Aenderungen aufbauen; base.contentSha = Version, deren
// Inhalte in original/data/pages stehen (weicht nur bei einem Entwurf auf aelterer Basis ab).
// base.ancestor = null | { data, pages }: Vergleichsbasis fuers naechste Speichern, pro Eintrag
// fuer Aenderungen, die waehrend eines Speichervorgangs gemacht wurden (siehe ancestor.js).
export function useSiteWorkingCopy(site) {
  const [base, setBase] = useState(() => ({
    headSha: site.headSha,
    contentSha: site.headSha,
    original: site.original ?? {},
    data: site.data,
    pages: site.pages ?? {},
    settings: site.settings ?? {},
    ancestor: null,
  }));
  const [data, setDataState] = useState(() => structuredClone(site.data));
  const [pages, setPagesState] = useState(() => structuredClone(site.pages ?? {}));
  // Einstellungen: { [Name]: Objekt }; fehlt ein Name, ist die Datei unberuehrt (Standardwerte im Editor).
  const [settings, setSettingsState] = useState(() => structuredClone(site.settings ?? {}));
  // Neuester Arbeitsstand, sofort aktuell (auch bevor React neu zeichnet) - fuer rebase/peek.
  const work = useRef(null);
  if (work.current === null) work.current = { data, pages, settings };
  const setData = (v) => {
    work.current = { ...work.current, data: typeof v === 'function' ? v(work.current.data) : v };
    setDataState(work.current.data);
  };
  const setPages = (v) => {
    work.current = { ...work.current, pages: typeof v === 'function' ? v(work.current.pages) : v };
    setPagesState(work.current.pages);
  };
  const setSettings = (v) => {
    work.current = { ...work.current, settings: typeof v === 'function' ? v(work.current.settings) : v };
    setSettingsState(work.current.settings);
  };
  // Volle Repo-Pfade, die beim Speichern geloescht werden (Task 7).
  const [removedFiles, setRemovedFiles] = useState([]);
  // { path, bytes } - neue Bilder (Task 10).
  const [newImages, setNewImages] = useState([]);

  const changes = useMemo(
    () => collectChanges({ config: site.config, original: base.original }, data, pages, newImages, removedFiles, settings),
    [site.config, base.original, data, pages, newImages, removedFiles, settings],
  );

  // snapshot = der Stand, der tatsaechlich gespeichert wurde (waehrend des Speicherns
  // kann weiter bearbeitet werden; diese neueren Aenderungen bleiben ungespeichert).
  function markSaved(headSha, snapshot) {
    const now = work.current;
    setBase((b) => {
      const original = { ...b.original };
      for (const c of snapshot.changes) {
        if (c.delete) delete original[c.path];
        else if (c.text !== undefined) original[c.path] = c.text;
      }
      return {
        headSha, contentSha: headSha, original, data: snapshot.data, pages: snapshot.pages, settings: snapshot.settings ?? {},
        ancestor: pruneAncestor(site.config, b.ancestor, snapshot, now),
      };
    });
    setRemovedFiles((files) => files.filter((f) => !snapshot.removedFiles.includes(f)));
    setNewImages((imgs) => imgs.filter((i) => !snapshot.newImages.includes(i)));
  }

  // Entwurf uebernehmen. Seine Basis bleibt die Grundlage fuers Speichern: hat inzwischen
  // jemand anderes gespeichert, lehnt GitHub die Aenderung ab (kein stilles Ueberschreiben).
  function restore(draft) {
    setData({ ...structuredClone(site.data), ...draft.data });
    setPages({ ...structuredClone(site.pages ?? {}), ...draft.pages });
    setSettings({ ...structuredClone(site.settings ?? {}), ...draft.settings });
    setRemovedFiles([...new Set(draft.removedFiles)]);
    setNewImages(imagesFromDraft(draft.newImages));
    if (draft.baseSha) setBase((b) => ({ ...b, headSha: draft.baseSha, ancestor: draft.ancestor ?? null }));
  }

  // Nach dem Zusammenfuehren: neue Basis (der inzwischen gespeicherte Stand) und zusammengefuehrter
  // Arbeitsstand. from = der Arbeitsstand, der zusammengefuehrt wurde. Was seither bearbeitet wurde,
  // geht vor und behaelt pro Eintrag die Fassung von from als Vergleichsbasis (siehe ancestor.js).
  function rebase(nextBase, from, merged) {
    const next = rebaseState(site.config, from, work.current, merged);
    setBase({ ...nextBase, ancestor: next.ancestor });
    setData(next.data);
    setPages(next.pages);
    setSettings(next.settings ?? {});
  }

  const peek = () => work.current;

  return {
    base, data, setData, pages, setPages, settings, setSettings, removedFiles, setRemovedFiles, newImages, setNewImages,
    changes, dirty: changes.length > 0, markSaved, restore, rebase, peek,
  };
}
