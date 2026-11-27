import { describe, it, expect, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import HistoryPanel from './HistoryPanel.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container, root;
afterEach(() => { act(() => root?.unmount()); container?.remove(); });
async function render(client) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<HistoryPanel site={{ repo: 'o/r' }} client={client} />));
}

describe('HistoryPanel', () => {
  it('zeigt Eintraege', async () => {
    await render({ listCommits: async () => [{ message: 'Ressource geändert', author: { name: 'Anna' }, date: '2026-11-27T10:00:00Z' }] });
    const li = container.querySelector('li');
    expect(li.textContent).toContain('Anna: Ressource geändert');
    expect(li.textContent).toContain(' — ');
  });
  it('leer', async () => {
    await render({ listCommits: async () => [] });
    expect(container.textContent).toContain('Noch keine Änderungen.');
  });
  it('Fehler als alert', async () => {
    await render({ listCommits: async () => { throw new Error('kaputt'); } });
    expect(container.querySelector('[role="alert"]').textContent).toContain('kaputt');
  });
});
