// Letzte Aenderungen als einfache Liste: { when, who, message }.
export async function listHistory(client, repo, perPage = 20) {
  const commits = await client.listCommits(repo, { perPage });
  return commits.map((c) => ({
    when: new Date(c.date),
    who: c.author?.name || c.author?.login || 'unbekannt',
    message: String(c.message ?? '').split('\n')[0],
  }));
}
