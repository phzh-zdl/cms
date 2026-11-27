import { describe, it, expect, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useSiteWorkingCopy } from './useSiteWorkingCopy.js';
import { serializeJson } from './serialize.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container, root, wc;
afterEach(() => { act(() => root?.unmount()); container?.remove(); container = root = wc = null; });

function Harness({ site }) {
  wc = useSiteWorkingCopy(site);
  return null;
}
async function mount(site) {
  container = document.createElement('div');
  root = createRoot(container);
  await act(async () => root.render(<Harness site={site} />));
}

const config = {
  name: 'T', contentRoot: 'content', pages: [{ id: 'imp', file: 'imp.json', label: 'Impressum' }],
  collections: [
    { id: 'cat', file: 'cat.json', key: 'id', titleField: 'label', fields: [] },
    { id: 'res', file: 'res.json', key: 'id', titleField: 'title', fields: [] },
  ],
};
const X = { id: 'x', label: 'X' };
const Y = { id: 'y', label: 'Y' };
const R = { id: 'r', title: 'R' };
const PAGE = { id: 'imp', title: 'Impressum', html: '<p>a</p>' };
const site = {
  repo: 'o/r', headSha: 'h0', config,
  original: { 'content/cat.json': serializeJson([X, Y]), 'content/res.json': serializeJson([R]), 'content/imp.json': serializeJson(PAGE) },
  data: { cat: [X, Y], res: [R] }, pages: { imp: PAGE },
};

describe('useSiteWorkingCopy.rebase', () => {
  it('ohne Bearbeitung seit dem Klick: zusammengefuehrter Stand, keine alte Vergleichsbasis', async () => {
    await mount(site);
    const from = { data: wc.data, pages: wc.pages };
    const merged = { data: { cat: [{ ...X, label: 'X2' }, Y], res: [R] }, pages: { imp: PAGE } };
    await act(async () => wc.rebase({ headSha: 'h1', contentSha: 'h1', original: {}, data: merged.data, pages: merged.pages }, from, merged));
    expect(wc.data).toBe(merged.data);
    expect(wc.base.headSha).toBe('h1');
    expect(wc.base.ancestor).toBeNull();
  });

  it('seit dem Klick bearbeitet: eigene Aenderung bleibt, Vergleichsbasis ist der Stand vom Klick', async () => {
    await mount(site);
    const from = { data: wc.data, pages: wc.pages };
    // nach dem Klick: X und die Textseite bearbeitet (rebase im selben Durchlauf, ohne Neuzeichnen)
    const theirsData = { cat: [{ ...X, label: 'X von anderen' }, { ...Y, label: 'Y von anderen' }], res: [R, { id: 'r2', title: 'R2' }] };
    const merged = { data: theirsData, pages: { imp: { ...PAGE, title: 'Neu von anderen' } } };
    await act(async () => {
      wc.setData((d) => ({ ...d, cat: [{ ...X, label: 'X von mir' }, Y] }));
      wc.setPages((p) => ({ ...p, imp: { ...PAGE, html: '<p>mein</p>' } }));
      wc.rebase({ headSha: 'h1', contentSha: 'h1', original: {}, data: theirsData, pages: merged.pages }, from, merged);
    });
    expect(wc.data.cat).toEqual([{ ...X, label: 'X von mir' }, { ...Y, label: 'Y von anderen' }]);
    expect(wc.data.res).toEqual(theirsData.res);
    expect(wc.pages.imp.html).toBe('<p>mein</p>');
    expect(wc.base.ancestor).toEqual({ data: { cat: [X, Y] }, pages: { imp: PAGE } });
    // markSaved behaelt die Vergleichsbasis
    await act(async () => wc.markSaved('h2', { changes: [], data: merged.data, pages: merged.pages, removedFiles: [], newImages: [] }));
    expect(wc.base.ancestor).toEqual({ data: { cat: [X, Y] }, pages: { imp: PAGE } });
  });

  it('peek liefert den neuesten Stand auch vor dem Neuzeichnen', async () => {
    await mount(site);
    let seen;
    await act(async () => {
      wc.setData((d) => ({ ...d, res: [] }));
      seen = wc.peek().data.res;
    });
    expect(seen).toEqual([]);
  });
});
