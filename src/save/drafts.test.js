import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveDraft, loadDraft, clearDraft, imagesToDraft, imagesFromDraft, settleDraftAfterSave } from './drafts.js';

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

const state = {
  savedAt: '2026-11-27T10:00:00.000Z',
  baseSha: 'abc',
  data: { resources: [{ id: 'r1', title: 'Ä' }] },
  pages: { impressum: { body: 'x' } },
  removedFiles: ['img/old.png'],
  newImages: [{ path: 'img/a.png', base64: 'AQID' }],
};

describe('drafts', () => {
  it('Rundreise unter cms.draft.<repo>', () => {
    expect(saveDraft('o/r', state)).toBe(true);
    expect(localStorage.getItem('cms.draft.o/r')).not.toBeNull();
    expect(loadDraft('o/r')).toEqual(state);
    expect(loadDraft('o/other')).toBeNull();
    clearDraft('o/r');
    expect(loadDraft('o/r')).toBeNull();
  });
  it('voller Speicher: kein Absturz, Rueckgabe false', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('voll', 'QuotaExceededError'); });
    expect(saveDraft('o/r', state)).toBe(false);
  });
  it('kaputter Entwurf -> null', () => {
    localStorage.setItem('cms.draft.o/r', '{kaputt');
    expect(loadDraft('o/r')).toBeNull();
    localStorage.setItem('cms.draft.o/r', '{"foo":1}');
    expect(loadDraft('o/r')).toBeNull();
  });
  it('Bilder als base64 hin und zurueck', () => {
    const imgs = [{ path: 'img/a.png', bytes: new Uint8Array([1, 2, 3, 255]) }];
    const enc = imagesToDraft(imgs);
    expect(enc).toEqual([{ path: 'img/a.png', base64: 'AQID/w==' }]);
    expect(imagesFromDraft(enc)).toEqual(imgs);
  });

  it('nach dem Speichern: Entwurf gleich Gespeichertem -> weg', () => {
    saveDraft('o/r', state);
    settleDraftAfterSave('o/r', { data: state.data, pages: state.pages, removedFiles: state.removedFiles, newImages: imagesFromDraft(state.newImages) }, 'abc', 'new');
    expect(loadDraft('o/r')).toBeNull();
  });
  it('nach dem Speichern: neuerer Entwurf bleibt, Basis = neue Version', () => {
    saveDraft('o/r', state);
    settleDraftAfterSave('o/r', { data: { resources: [] }, pages: state.pages, removedFiles: [], newImages: [] }, 'abc', 'new');
    expect(loadDraft('o/r')).toEqual({ ...state, baseSha: 'new' });
  });
  it('nach dem Speichern: Entwurf auf anderer Basis bleibt unveraendert', () => {
    saveDraft('o/r', { ...state, baseSha: 'other' });
    settleDraftAfterSave('o/r', { data: {}, pages: {}, removedFiles: [], newImages: [] }, 'abc', 'new');
    expect(loadDraft('o/r').baseSha).toBe('other');
  });
});
