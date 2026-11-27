// Adresse (#/<owner>/<repo>) pruefen. Gibt 'owner/repo' oder null zurueck.
export const DEFAULT_ORG = 'phzh-zdl';

export function parseSiteHash(hash, org = DEFAULT_ORG) {
  let decoded;
  try {
    decoded = decodeURIComponent(String(hash ?? ''));
  } catch {
    return null;
  }
  const m = decoded.match(/^#\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/);
  if (!m) return null;
  const [owner, name] = m[1].split('/');
  if (owner !== org || name === '.' || name === '..') return null;
  return m[1];
}
