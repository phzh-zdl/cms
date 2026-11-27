import { useMemo, useState } from 'react';
import { collectChanges } from './serialize.js';
import { imagesFromDraft } from './drafts.js';
import { mergeSite, applyChoices } from './merge.js';

// Arbeitsstand einer Seite + die Basis (zuletzt geladener/gespeicherter Stand),
// gegen die Aenderungen, "neu" und die Commit-Beschreibung berechnet werden.
// base.headSha = Version, auf der die Aenderungen aufbauen; base.contentSha = Version, deren
// Inhalte in original/data/pages stehen (weicht nur bei einem Entwurf auf aelterer Basis ab).
export function useSiteWorkingCopy(site) {
  const [base, setBase] = useState(() => ({
    headSha: site.headSha,
    contentSha: site.headSha,
    original: site.original ?? {},
    data: site.data,
    pages: site.pages ?? {},
  }));
  const [data, setData] = useState(() => structuredClone(site.data));
  const [pages, setPages] = useState(() => structuredClone(site.pages ?? {}));
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
      return { headSha, contentSha: headSha, original, data: snapshot.data, pages: snapshot.pages };
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
    if (draft.baseSha) setBase((b) => ({ ...b, headSha: draft.baseSha }));
  }

  // Nach dem Zusammenfuehren: neue Basis (der inzwischen gespeicherte Stand) und zusammengefuehrter
  // Arbeitsstand. from = der Arbeitsstand, der zusammengefuehrt wurde. Wurde seither weiter
  // bearbeitet, bleiben diese neueren Aenderungen erhalten (sie gehen vor).
  function rebase(nextBase, from, merged) {
    const preferMine = (b, m, t) => {
      const r = mergeSite(site.config, b, m, t);
      return applyChoices(r, r.conflicts.map(() => 'mine'));
    };
    setBase(nextBase);
    setData((cur) => (cur === from.data ? merged.data
      : preferMine({ data: from.data }, { data: cur }, { data: merged.data }).data));
    setPages((cur) => (cur === from.pages ? merged.pages
      : preferMine({ pages: from.pages }, { pages: cur }, { pages: merged.pages }).pages));
  }

  return {
    base, data, setData, pages, setPages, removedFiles, setRemovedFiles, newImages, setNewImages,
    changes, dirty: changes.length > 0, markSaved, restore, rebase,
  };
}
