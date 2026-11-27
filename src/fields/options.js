// Auswahl-Optionen einer Referenz: Zeilen der Ziel-Sammlung, nach Titel (de) sortiert.
export function referenceOptions(field, ctx) {
  const titleField = ctx.collections?.find((c) => c.id === field.to)?.titleField ?? 'label';
  return (ctx.data?.[field.to] ?? [])
    .map((r) => ({ id: r.id, title: String(r[titleField] ?? r.id) }))
    .sort((a, b) => a.title.localeCompare(b.title, 'de'));
}
