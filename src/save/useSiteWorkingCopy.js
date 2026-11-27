import { useMemo, useRef, useState } from 'react';
import { collectChanges } from './serialize.js';
import { imagesFromDraft } from './drafts.js';
import { mergeCollections, applyChoices, keysUsable, sameValue } from './merge.js';

// Arbeitsstand einer Seite + die Basis (zuletzt geladener/gespeicherter Stand),
// gegen die Aenderungen, "neu" und die Commit-Beschreibung berechnet werden.
// base.headSha = Version, auf der die Aenderungen aufbauen; base.contentSha = Version, deren
// Inhalte in original/data/pages stehen (weicht nur bei einem Entwurf auf aelterer Basis ab).
// base.ancestor = null | { data: { [Sammlung]: Zeilen }, pages: { [Seite]: Seite } }: fuer Dateien,
// die waehrend eines Speichervorgangs weiter bearbeitet wurden, der Stand vom Klick. Das naechste
// Speichern fuehrt dann gegen diesen Stand zusammen (und fragt nach, statt still zu ueberschreiben).
export function useSiteWorkingCopy(site) {
  const [base, setBase] = useState(() => ({
    headSha: site.headSha,
    contentSha: site.headSha,
    original: site.original ?? {},
    data: site.data,
    pages: site.pages ?? {},
    ancestor: null,
  }));
  const [data, setDataState] = useState(() => structuredClone(site.data));
  const [pages, setPagesState] = useState(() => structuredClone(site.pages ?? {}));
  // Neuester Arbeitsstand, sofort aktuell (auch bevor React neu zeichnet) - fuer rebase/peek.
  const work = useRef(null);
  if (work.current === null) work.current = { data, pages };
  const setData = (v) => {
    work.current = { ...work.current, data: typeof v === 'function' ? v(work.current.data) : v };
    setDataState(work.current.data);
  };
  const setPages = (v) => {
    work.current = { ...work.current, pages: typeof v === 'function' ? v(work.current.pages) : v };
    setPagesState(work.current.pages);
  };
  // Volle Repo-Pfade, die beim Speichern geloescht werden (Task 7).
  const [removedFiles, setRemovedFiles] = useState([]);
  // { path, bytes } - neue Bilder (Task 10).
  const [newImages, setNewImages] = useState([]);

  const changes = useMemo(
    () => collectChanges({ config: site.config, original: base.original }, data, pages, newImages, removedFiles),
    [site.config, base.original, data, pages, newImages, removedFiles],
  );

  // snapshot = der Stand, der tatsaechlich gespeichert wurde (waehrend des Speicherns
  // kann weiter bearbeitet werden; diese neueren Aenderungen bleiben ungespeichert).
  function markSaved(headSha, snapshot) {
    setBase((b) => {
      const original = { ...b.original };
      for (const c of snapshot.changes) {
        if (c.delete) delete original[c.path];
        else if (c.text !== undefined) original[c.path] = c.text;
      }
      return { headSha, contentSha: headSha, original, data: snapshot.data, pages: snapshot.pages, ancestor: b.ancestor ?? null };
    });
    setRemovedFiles((files) => files.filter((f) => !snapshot.removedFiles.includes(f)));
    setNewImages((imgs) => imgs.filter((i) => !snapshot.newImages.includes(i)));
  }

  // Entwurf uebernehmen. Seine Basis bleibt die Grundlage fuers Speichern: hat inzwischen
  // jemand anderes gespeichert, lehnt GitHub die Aenderung ab (kein stilles Ueberschreiben).
  function restore(draft) {
    setData({ ...structuredClone(site.data), ...draft.data });
    setPages({ ...structuredClone(site.pages ?? {}), ...draft.pages });
    setRemovedFiles([...new Set(draft.removedFiles)]);
    setNewImages(imagesFromDraft(draft.newImages));
    if (draft.baseSha) setBase((b) => ({ ...b, headSha: draft.baseSha, ancestor: draft.ancestor ?? null }));
  }

  // Nach dem Zusammenfuehren: neue Basis (der inzwischen gespeicherte Stand) und zusammengefuehrter
  // Arbeitsstand. from = der Arbeitsstand, der zusammengefuehrt wurde. Wurde eine Datei seither
  // weiter bearbeitet, gehen diese neueren Aenderungen vor, und fuer sie wird der Stand von from als
  // Vergleichsbasis (base.ancestor) behalten - sonst ueberschriebe das naechste Speichern still,
  // was die anderen inzwischen an denselben Eintraegen geaendert haben.
  function rebase(nextBase, from, merged) {
    const cur = work.current;
    const ancestor = { data: {}, pages: {} };
    let touched = false;
    const data = { ...merged.data };
    for (const c of site.config.collections) {
      const [f, k, m] = [from.data?.[c.id], cur.data?.[c.id], merged.data?.[c.id]];
      if (f === k || sameValue(f, k)) continue;
      touched = true;
      ancestor.data[c.id] = f;
      const key = c.key ?? 'id';
      if ([f, k, m].every((rows) => keysUsable(rows, key))) {
        const r = mergeCollections(f, k, m, key);
        const conflicts = r.conflicts.map((x) => ({ kind: 'collection', collectionId: c.id, ...x }));
        // Konflikt: meine neuere Fassung
        data[c.id] = applyChoices({ data: { [c.id]: r.merged }, pages: {}, conflicts, keys: { [c.id]: key } },
          conflicts.map(() => 'mine')).data[c.id];
      } else {
        data[c.id] = k;
      }
    }
    const pages = { ...merged.pages };
    for (const p of site.config.pages) {
      const [f, k] = [from.pages?.[p.id], cur.pages?.[p.id]];
      if (f === k || sameValue(f, k)) continue;
      touched = true;
      ancestor.pages[p.id] = f;
      pages[p.id] = k;
    }
    setBase({ ...nextBase, ancestor: touched ? ancestor : null });
    setData(cur.data === from.data ? merged.data : data);
    setPages(cur.pages === from.pages ? merged.pages : pages);
  }

  const peek = () => work.current;

  return {
    base, data, setData, pages, setPages, removedFiles, setRemovedFiles, newImages, setNewImages,
    changes, dirty: changes.length > 0, markSaved, restore, rebase, peek,
  };
}
