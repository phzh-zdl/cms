// Schreibt Aenderungen als eine neue Version direkt auf main - nie mit Force.
// Fehler (AuthError, ConflictError, GitHubError) werden unveraendert weitergegeben.
const BRANCH = 'main';

export async function saveChanges(client, repo, { baseSha, changes, message }) {
  const { treeSha } = await client.getCommit(repo, baseSha);
  const existing = new Set(
    (await client.getTree(repo, treeSha, true)).filter((e) => e.type === 'blob').map((e) => e.path),
  );

  const entries = [];
  const encoder = new TextEncoder();
  for (const change of changes) {
    if (change.delete) {
      // Nur loeschen, was es in der Basis gibt (z. B. nicht das Bild eines nie gespeicherten Eintrags).
      if (existing.has(change.path)) entries.push({ path: change.path, sha: null });
      continue;
    }
    const bytes = change.bytes ?? encoder.encode(change.text);
    entries.push({ path: change.path, sha: await client.createBlob(repo, bytes) });
  }
  if (entries.length === 0) return baseSha;

  const tree = await client.createTree(repo, treeSha, entries);
  const commit = await client.createCommit(repo, message, tree, baseSha);
  await client.updateRef(repo, BRANCH, commit);
  return commit;
}
