import { useMemo, useState } from 'react';
import { collectChanges } from './serialize.js';
import { imagesFromDraft } from './drafts.js';

// Arbeitsstand einer Seite + die Basis (zuletzt geladener/gespeicherter Stand),
// gegen die Aenderungen, "neu" und die Commit-Beschreibung berechnet werden.
export function useSiteWorkingCopy(site) {
  const [base, setBase] = useState(() => ({
    headSha: site.headSha,
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
      return { headSha, original, data: snapshot.data, pages: snapshot.pages };
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

  return {
    base, data, setData, pages, setPages, removedFiles, setRemovedFiles, newImages, setNewImages,
    changes, dirty: changes.length > 0, markSaved, restore,
  };
}
