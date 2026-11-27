import { useEffect, useRef, useState } from 'react';
import { ConflictError } from '../github/client.js';
import { loadContentAt } from '../content/site.js';
import { collectChanges } from './serialize.js';
import { buildCommitMessage, summarizeChanges } from './commitMessage.js';
import { saveChanges } from './saveChanges.js';
import { mergeSite, applyChoices } from './merge.js';
import { invalidParts } from './siteErrors.js';

const BRANCH = 'main';
const MAX_ATTEMPTS = 3;
export const MSG_BUSY = 'Speichern ist gerade nicht möglich, weil laufend andere Änderungen eintreffen. Bitte in einer Minute erneut versuchen.';
export const MSG_CANCELLED = 'Speichern abgebrochen. Ihre Änderungen sind weiterhin vorhanden.';

// Speichern mit Zusammenfuehren: Hat inzwischen jemand anderes gespeichert, wird dessen Stand
// geladen und mit dem eigenen zusammengefuehrt; Konflikte entscheidet die Person im Dialog.
// Liefert { save, announce, notice, dialog } - dialog: Props fuer ConflictDialog oder null.
export function useConflictSave(site, client, wc) {
  const { repo, config } = site;
  const [notice, setNotice] = useState(null);
  const [ask, setAsk] = useState(null); // { result, index, choices, resolve }
  const mounted = useRef(true);
  const pending = useRef(null); // resolve des offenen Dialogs
  useEffect(() => {
    mounted.current = true;
    // Editor verlassen, waehrend der Dialog offen ist = abbrechen (Entwurf bleibt).
    return () => { mounted.current = false; pending.current?.(null); };
  }, []);

  // Hinweis "… seit dem Oeffnen von <Name> geaendert" (Name der neuesten Speicherung auf main).
  async function announce() {
    let name = 'jemand anderem';
    try {
      const [latest] = await client.listCommits(repo, { perPage: 1 });
      name = latest?.author?.name || latest?.author?.login || name;
    } catch { /* Name ist nur Beiwerk */ }
    if (mounted.current) setNotice(`Diese Seite wurde seit dem Öffnen von ${name} geändert.`);
  }

  // Fragt die Konflikte nacheinander ab. Liefert ['mine' | 'theirs', …] oder null (abgebrochen).
  const askChoices = (result) => new Promise((resolve) => {
    pending.current = (choices) => { pending.current = null; resolve(choices); };
    setAsk({ result, index: 0, choices: [], resolve: pending.current });
  });

  // Eigenen Stand mit dem aktuellen Stand auf main zusammenfuehren. null = abgebrochen.
  // Vergleichsbasis = Inhalt bei base.headSha, fuer waehrend eines Speicherns bearbeitete Dateien
  // der Stand vom Klick (base.ancestor). Wirft UnmergeableError.
  async function mergeOnto(base, mine, head) {
    const content = base.contentSha === base.headSha ? base : await loadContentAt(client, repo, config, base.headSha);
    const ancestor = {
      data: { ...content.data, ...base.ancestor?.data },
      pages: { ...content.pages, ...base.ancestor?.pages },
      settings: { ...content.settings, ...base.ancestor?.settings },
    };
    const theirs = head === base.contentSha
      ? { original: base.original, data: base.data, pages: base.pages, settings: base.settings }
      : await loadContentAt(client, repo, config, head);
    const result = mergeSite(config, ancestor, mine, theirs);
    let merged = result;
    if (result.conflicts.length > 0) {
      if (!mounted.current) return null;
      const choices = await askChoices(result);
      if (!choices) return null;
      merged = applyChoices(result, choices);
    }
    return {
      base: { headSha: head, contentSha: head, ...theirs, settings: theirs.settings ?? {} },
      mine: { data: merged.data, pages: merged.pages, settings: merged.settings ?? {} },
    };
  }

  // work = { data, pages, settings, newImages, removedFiles } (Stand beim Klick auf "Speichern").
  // Liefert { status: 'saved', sha, baseSha, snapshot } | { status: 'cancelled' } | { status: 'busy' }
  // | { status: 'invalid' } (Ergebnis des Zusammenfuehrens hat Fehler, nichts geschrieben);
  // andere Fehler werden weitergegeben.
  async function save({ data, pages, settings = {}, newImages, removedFiles }) {
    let base = wc.base;
    let mine = { data, pages, settings };
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const head = await client.getRef(repo, BRANCH);
      const moved = head !== base.headSha;
      if (moved || base.ancestor) {
        if (moved) await announce();
        const next = await mergeOnto(base, mine, head);
        if (!next) return { status: 'cancelled' };
        wc.rebase(next.base, mine, next.mine);
        ({ base, mine } = next);
        // Zusammengefuehrtes Ergebnis wie vor dem Speichern pruefen; mit Fehlern nichts schreiben.
        // (Noch verwendete Bilder loescht collectChanges ohnehin nicht, siehe stillRemoved.)
        if (invalidParts(config, mine.data, mine.settings, base.data).length > 0) return { status: 'invalid' };
      }
      const changes = collectChanges({ config, original: base.original }, mine.data, mine.pages, newImages, removedFiles, mine.settings);
      const message = buildCommitMessage(
        summarizeChanges(config, base.data, mine.data, base.pages, mine.pages, base.settings, mine.settings), newImages.length);
      try {
        const sha = await saveChanges(client, repo, { baseSha: base.headSha, changes, message });
        return { status: 'saved', sha, baseSha: base.headSha, snapshot: { ...mine, changes, newImages, removedFiles } };
      } catch (e) {
        if (!(e instanceof ConflictError)) throw e;
      }
    }
    return { status: 'busy' };
  }

  const dialog = ask && {
    conflict: ask.result.conflicts[ask.index],
    index: ask.index,
    total: ask.result.conflicts.length,
    config,
    data: ask.result.data,
    onChoose: (side) => {
      const choices = [...ask.choices, side];
      if (choices.length === ask.result.conflicts.length) {
        setAsk(null);
        ask.resolve(choices);
      } else {
        setAsk({ ...ask, index: ask.index + 1, choices });
      }
    },
    onCancel: () => { setAsk(null); ask.resolve(null); },
  };

  return { save, announce, notice, dialog };
}
