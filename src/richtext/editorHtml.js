// Gespeichertes HTML hat <details><summary>..</summary>Inhalt</details>; der Editor erwartet den
// Inhalt in einem eigenen Container (details-content). Vor dem Laden entsprechend einpacken.
export function toEditorHtml(html) {
  const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');
  for (const d of doc.body.querySelectorAll('details')) {
    if (d.querySelector(':scope > div[data-type="details-content"]')) continue;
    const wrap = doc.createElement('div');
    wrap.setAttribute('data-type', 'details-content');
    for (const child of [...d.childNodes]) {
      if (child.nodeName !== 'SUMMARY') wrap.appendChild(child);
    }
    d.appendChild(wrap);
  }
  return doc.body.innerHTML;
}
