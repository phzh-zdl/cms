import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { Editor } from './ImageField.jsx';

// Zuschneide-Dialog ersetzt: liefert auf Knopfdruck feste Bytes.
vi.mock('../images/CropDialog.jsx', () => ({
  default: ({ background, onApply, onCancel }) => (
    <div role="dialog" data-bg={background}>
      <button type="button" onClick={() => onApply(new Uint8Array([9, 9]))}>Übernehmen</button>
      <button type="button" onClick={onCancel}>Abbrechen</button>
    </div>
  ),
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container, root;
afterEach(() => { act(() => root?.unmount()); container?.remove(); container = root = null; vi.restoreAllMocks(); });

const field = { name: 'image', type: 'image', label: 'Bild', dir: 'images', colorFrom: 'category_id' };
const collection = {
  id: 'resources', titleField: 'title',
  fields: [{ name: 'category_id', type: 'reference', to: 'categories' }, field],
};
function makeImages(newPaths = []) {
  return {
    fullPath: (dir, name) => `content/${dir}/${name}`,
    add: vi.fn(), discard: vi.fn(), markRemoved: vi.fn(),
    isNew: (p) => newPaths.includes(p),
    preview: vi.fn().mockResolvedValue(null),
  };
}
async function render(value, images, onChange = vi.fn()) {
  const ctx = {
    images, collection, collections: [{ id: 'categories', key: 'id' }],
    entry: { title: 'T', category_id: 'k', image: value },
    data: { categories: [{ id: 'k', color: '#123456' }] },
  };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<Editor field={field} value={value} onChange={onChange} ctx={ctx} />));
  return onChange;
}
const click = (text) => act(async () => {
  [...container.querySelectorAll('button')].find((b) => b.textContent === text).click();
});
async function choose(file) {
  const input = container.querySelector('input[type=file]');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); });
}
const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4])], 'a.png', { type: 'image/png' });

describe('ImageField', () => {
  it('lehnt Dateien ueber 5 MB mit der festen Meldung ab', async () => {
    await render(null, makeImages());
    const big = png();
    Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 });
    await choose(big);
    expect(container.querySelector('[role=alert]').textContent).toBe('Nur PNG, JPEG, WebP oder GIF bis 5 MB');
    expect(container.querySelector('[role=dialog]')).toBeNull();
  });

  it('lehnt SVG ab, auch mit Bild-Endung', async () => {
    await render(null, makeImages());
    await choose(new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'a.png', { type: 'image/png' }));
    expect(container.querySelector('[role=alert]').textContent).toBe('Nur PNG, JPEG, WebP oder GIF bis 5 MB');
  });

  it('oeffnet den Editor mit der Fachbereichsfarbe und legt beim Uebernehmen ein neues Bild an', async () => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} }));
    const images = makeImages();
    const onChange = await render(null, images);
    await choose(png());
    expect(container.querySelector('[role=dialog]').dataset.bg).toBe('#123456');
    await click('Übernehmen');
    const [path, bytes] = images.add.mock.calls[0];
    expect(path).toMatch(/^content\/images\/[0-9a-f-]{36}\.webp$/);
    expect([...bytes]).toEqual([9, 9]);
    expect(onChange).toHaveBeenCalledWith(path.split('/').pop());
    expect(images.markRemoved).not.toHaveBeenCalled();
  });

  it('ersetzen eines vorhandenen Bildes merkt den alten Pfad zum Loeschen vor', async () => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} }));
    const images = makeImages();
    await render('alt.webp', images);
    await choose(png());
    await click('Übernehmen');
    expect(images.markRemoved).toHaveBeenCalledWith('content/images/alt.webp');
    expect(images.discard).not.toHaveBeenCalled();
  });

  it('ersetzen eines neuen, ungespeicherten Bildes verwirft es', async () => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} }));
    const images = makeImages(['content/images/neu.webp']);
    await render('neu.webp', images);
    await choose(png());
    await click('Übernehmen');
    expect(images.discard).toHaveBeenCalledWith('content/images/neu.webp');
    expect(images.markRemoved).not.toHaveBeenCalled();
  });

  it('"Bild entfernen" setzt das Feld auf null und merkt das alte Bild vor', async () => {
    const images = makeImages();
    const onChange = await render('alt.webp', images);
    await click('Bild entfernen');
    expect(onChange).toHaveBeenCalledWith(null);
    expect(images.markRemoved).toHaveBeenCalledWith('content/images/alt.webp');
  });

  it('zeigt die Vorschau mit Alt-Text', async () => {
    const images = makeImages();
    images.preview.mockResolvedValue('blob:vorschau');
    await render('alt.webp', images);
    expect(container.querySelector('img').getAttribute('alt')).toBe('Vorschau: T');
  });
});
