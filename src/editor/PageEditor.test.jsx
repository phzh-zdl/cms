import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import PageEditor from './PageEditor.jsx';
import { stubLayoutApis } from '../richtext/testSetup.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container, root;
beforeEach(() => stubLayoutApis());
afterEach(() => { act(() => root?.unmount()); container?.remove(); container = root = null; });

async function render(ui) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(ui));
  return container;
}
const button = (c, text) => [...c.querySelectorAll('button')].find((b) => b.textContent === text);

describe('PageEditor', () => {
  it('reports title edits', async () => {
    const onChange = vi.fn();
    const page = { id: 'ueber', title: 'Über', html: '<p>Hallo</p>' };
    const c = await render(<PageEditor page={page} onChange={onChange} toolbar="basic" />);
    const label = [...c.querySelectorAll('label')].find((l) => l.textContent === 'Titel');
    const input = document.getElementById(label.htmlFor);
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Neu');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith({ ...page, title: 'Neu' });
  });

  it('reports content edits with sanitized html', async () => {
    const onChange = vi.fn();
    const page = { id: 'ueber', title: 'Über', html: '' };
    const c = await render(<PageEditor page={page} onChange={onChange} toolbar="basic" />);
    await act(async () => c.querySelector('[role="textbox"]').editor.commands.insertContent('<p>Hi</p>'));
    expect(onChange.mock.calls.at(-1)[0]).toEqual({ ...page, html: '<p>Hi</p>' });
  });

  it('previews sanitized html and switches back', async () => {
    const page = { id: 'ueber', title: 'Über', html: '<p>Hallo</p><script>alert(1)</script><a href="javascript:x">Z</a>' };
    const c = await render(<PageEditor page={page} onChange={() => {}} toolbar="basic" />);
    await act(async () => button(c, 'Vorschau anzeigen').click());
    const preview = c.querySelector('.page-preview');
    expect(preview.textContent).toContain('Hallo');
    expect(preview.querySelector('script')).toBeNull();
    expect(preview.querySelector('a').hasAttribute('href')).toBe(false);
    expect(c.querySelector('[role="textbox"]')).toBeNull();
    await act(async () => button(c, 'Bearbeiten').click());
    expect(c.querySelector('[role="textbox"]')).not.toBeNull();
  });
});
