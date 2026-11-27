import { describe, it, expect, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import ExportPanel from './ExportPanel.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container, root;
afterEach(() => { act(() => root?.unmount()); container?.remove(); });
async function render(ui) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(ui));
}
const site = { repo: 'o/r', config: { contentRoot: 'c', export: { shell: 'build', zipName: 'z' } } };
const zipBtn = () => [...container.querySelectorAll('button')].find((b) => b.textContent === 'ZIP erstellen');

describe('ExportPanel', () => {
  it('ungespeicherte Aenderungen: Knopf gesperrt, Hinweis sichtbar', async () => {
    await render(<ExportPanel site={site} client={{}} dirty />);
    expect(zipBtn().disabled).toBe(true);
    expect(container.querySelector('[role="status"]').textContent).toBe('Bitte zuerst speichern.');
  });
  it('gespeichert: Knopf aktiv, kein Hinweis', async () => {
    await render(<ExportPanel site={site} client={{}} dirty={false} />);
    expect(zipBtn().disabled).toBe(false);
    expect(container.textContent).not.toContain('Bitte zuerst speichern.');
  });
  it('Fehler beim Erstellen als alert', async () => {
    const client = { getRef: async () => { throw new Error('kaputt'); } };
    await render(<ExportPanel site={site} client={client} dirty={false} />);
    await act(async () => zipBtn().click());
    expect(container.querySelector('[role="alert"]').textContent).toContain('kaputt');
  });
});
