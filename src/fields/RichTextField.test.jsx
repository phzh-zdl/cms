import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RichTextField from './RichTextField.jsx';
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
const byLabel = (c, label) => c.querySelector(`button[aria-label="${label}"]`);
const editorEl = (c) => c.querySelector('[role="textbox"]');
const urlInput = (c) => {
  const label = [...c.querySelectorAll('label')].find((l) => l.textContent === 'Linkadresse');
  return document.getElementById(label.htmlFor);
};
async function type(el, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const click = async (el) => act(async () => el.click());
const text = (c, t) => [...c.querySelectorAll('button')].find((b) => b.textContent === t);

describe('RichTextField toolbar', () => {
  it('basic offers no table, details or H4 button; full does', async () => {
    const c = await render(<RichTextField label="Inhalt" value="" onChange={() => {}} toolbar="basic" />);
    for (const l of ['Absatz', 'Zwischentitel 2', 'Zwischentitel 3', 'Fett', 'Kursiv', 'Aufzählung', 'Nummerierte Liste', 'Link']) {
      expect(byLabel(c, l), l).not.toBeNull();
      expect(byLabel(c, l).getAttribute('type')).toBe('button');
    }
    for (const l of ['Tabelle einfügen', 'Aufklappbarer Abschnitt', 'Zwischentitel 4', 'Link auf andere Seite']) {
      expect(byLabel(c, l), l).toBeNull();
    }
    act(() => root.unmount());
    c.remove();
    const f = await render(<RichTextField label="Inhalt" value="" onChange={() => {}} toolbar="full" pageIds={['impressum']} />);
    for (const l of ['Tabelle einfügen', 'Aufklappbarer Abschnitt', 'Zwischentitel 4', 'Link auf andere Seite']) {
      expect(byLabel(f, l), l).not.toBeNull();
    }
  });

  it('exposes a labelled multiline textbox and toggle state', async () => {
    const c = await render(<RichTextField label="Inhalt" value="<p>Hallo</p>" onChange={() => {}} toolbar="basic" />);
    const box = editorEl(c);
    expect(box.getAttribute('aria-multiline')).toBe('true');
    expect(box.getAttribute('aria-label')).toBe('Inhalt');
    expect(byLabel(c, 'Fett').getAttribute('aria-pressed')).toBe('false');
    await act(async () => box.editor.commands.selectAll());
    await click(byLabel(c, 'Fett'));
    expect(byLabel(c, 'Fett').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('RichTextField output', () => {
  it('never passes script content to onChange', async () => {
    const onChange = vi.fn();
    const c = await render(<RichTextField label="Inhalt" value="" onChange={onChange} toolbar="basic" />);
    await act(async () => editorEl(c).editor.commands.insertContent('<p>Hallo</p><script>alert(1)</script><img src="x" onerror="alert(2)">'));
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)[0];
    expect(last).toContain('Hallo');
    expect(last).not.toMatch(/script|alert|<img/i);
  });

  it('does not allow disabled node types (blockquote, code, h1, h4 in basic)', async () => {
    const onChange = vi.fn();
    const c = await render(<RichTextField label="Inhalt" value="" onChange={onChange} toolbar="basic" />);
    await act(async () => editorEl(c).editor.commands.insertContent('<h1>A</h1><blockquote><p>B</p></blockquote><pre><code>C</code></pre><h4>D</h4>'));
    const last = onChange.mock.calls.at(-1)[0];
    expect(last).not.toMatch(/<(h1|blockquote|pre|code|h4)/);
  });

  it('round-trips details from stored html in the full toolbar', async () => {
    const onChange = vi.fn();
    const c = await render(<RichTextField label="Inhalt" value="<details><summary>Mehr</summary><p>X</p></details>" onChange={onChange} toolbar="full" />);
    await act(async () => editorEl(c).editor.commands.insertContent('<p>Neu</p>'));
    const last = onChange.mock.calls.at(-1)[0];
    expect(last).toMatch(/<details[^>]*><summary>Mehr<\/summary><p>X<\/p><\/details>/);
  });
});

describe('RichTextField link dialog', () => {
  async function openLink(onChange) {
    const c = await render(<RichTextField label="Inhalt" value="<p>Hallo</p>" onChange={onChange} toolbar="basic" />);
    await act(async () => { editorEl(c).editor.commands.selectAll(); });
    await click(byLabel(c, 'Link'));
    return c;
  }

  it('rejects javascript: with the exact message', async () => {
    const onChange = vi.fn();
    const c = await openLink(onChange);
    await type(urlInput(c), 'javascript:alert(1)');
    await click(text(c, 'Übernehmen'));
    expect(c.querySelector('[role="alert"]').textContent).toBe('Nur https-Links oder E-Mail-Adressen');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('accepts https and mailto', async () => {
    for (const [url, expected] of [['https://phzh.ch', 'href="https://phzh.ch"'], ['mailto:a@b.ch', 'href="mailto:a@b.ch"']]) {
      const onChange = vi.fn();
      const c = await openLink(onChange);
      await type(urlInput(c), url);
      await click(text(c, 'Übernehmen'));
      expect(c.querySelector('[role="alert"]')).toBeNull();
      expect(onChange.mock.calls.at(-1)[0]).toContain(expected);
      act(() => root.unmount());
      c.remove();
    }
  });

  it('cancel closes the dialog', async () => {
    const c = await openLink(vi.fn());
    expect(c.querySelector('form.link-form')).not.toBeNull();
    await click(text(c, 'Abbrechen'));
    expect(c.querySelector('form.link-form')).toBeNull();
  });

  it('offers a page picker with relative targets in the full toolbar', async () => {
    const onChange = vi.fn();
    const c = await render(<RichTextField label="Inhalt" value="<p>Hallo</p>" onChange={onChange} toolbar="full" pageIds={['impressum', 'ueber']} />);
    await act(async () => { editorEl(c).editor.commands.selectAll(); });
    await click(byLabel(c, 'Link auf andere Seite'));
    const select = c.querySelector('select');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'impressum');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await click(text(c, 'Übernehmen'));
    expect(onChange.mock.calls.at(-1)[0]).toContain('href="impressum.html"');
  });
});
