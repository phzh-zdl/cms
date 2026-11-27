import { describe, it, expect, vi } from 'vitest';
import { boot, MSG_FRAMED } from './boot.js';

describe('boot', () => {
  it('eingebettet: Hinweis statt App, nichts wird gemountet', () => {
    const root = document.createElement('div');
    const mount = vi.fn();
    const win = { self: {}, top: {}, document };
    expect(boot(win, root, mount)).toBe(false);
    expect(mount).not.toHaveBeenCalled();
    expect(root.textContent).toBe('Das ZDL CMS kann nicht eingebettet werden.');
    expect(MSG_FRAMED).toBe(root.textContent);
  });
  it('Zugriff auf top verboten zaehlt als eingebettet', () => {
    const win = { self: {}, get top() { throw new Error('x'); }, document };
    expect(boot(win, document.createElement('div'), vi.fn())).toBe(false);
  });
  it('eigenes Fenster: mountet', () => {
    const w = {}; w.self = w; w.top = w;
    const root = document.createElement('div');
    const mount = vi.fn();
    expect(boot(w, root, mount)).toBe(true);
    expect(mount).toHaveBeenCalledWith(root);
  });
});
