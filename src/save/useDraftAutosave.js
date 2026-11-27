import { useEffect, useRef, useState } from 'react';
import { saveDraft, clearDraft, imagesToDraft } from './drafts.js';

const DELAY_MS = 1000;

// Sichert den Arbeitsstand 1 s nach jeder Aenderung als Entwurf (bzw. entfernt ihn,
// wenn nichts mehr ungespeichert ist), beim Verlassen sofort. enabled=false, solange
// ueber einen vorhandenen Entwurf noch nicht entschieden wurde.
// Liefert { failed, flush } - flush() sichert sofort und gibt true/false zurueck.
export function useDraftAutosave(repo, wc, enabled) {
  const [failed, setFailed] = useState(false);
  const latest = useRef();
  latest.current = { wc, enabled };

  function write() {
    const { wc: w, enabled: on } = latest.current;
    if (!on) return true;
    if (!w.dirty) {
      clearDraft(repo);
      setFailed(false);
      return true;
    }
    const ok = saveDraft(repo, {
      savedAt: new Date().toISOString(),
      baseSha: w.base.headSha,
      data: w.data,
      pages: w.pages,
      removedFiles: w.removedFiles,
      newImages: imagesToDraft(w.newImages),
    });
    setFailed(!ok);
    return ok;
  }

  useEffect(() => {
    if (!enabled) return undefined;
    const t = setTimeout(write, DELAY_MS);
    return () => clearTimeout(t);
  }, [repo, wc.changes, wc.base.headSha, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Beim Verlassen des Editors nichts verlieren.
  useEffect(() => () => {
    const { wc: w, enabled: on } = latest.current;
    if (on && w.dirty) write();
  }, [repo]); // eslint-disable-line react-hooks/exhaustive-deps

  return { failed, flush: write };
}
