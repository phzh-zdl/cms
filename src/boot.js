// Start des CMS: eingebettet in ein fremdes Fenster (iframe) laeuft es nicht,
// damit niemand Klicks darauf umleiten kann (Clickjacking) und kein Code darin Zugriff erhaelt.
export const MSG_FRAMED = 'Das ZDL CMS kann nicht eingebettet werden.';

export function boot(win, rootEl, mount) {
  let framed;
  try { framed = win.self !== win.top; } catch { framed = true; }
  if (framed) {
    const p = win.document.createElement('p');
    p.setAttribute('role', 'alert');
    p.textContent = MSG_FRAMED;
    rootEl.replaceChildren(p);
    return false;
  }
  mount(rootEl);
  return true;
}
