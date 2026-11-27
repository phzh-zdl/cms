// Einfache Strukturprüfung der Workflow-YAMLs (keine Abhängigkeiten):
// keine Tabs, Einrückung in 2er-Schritten, Pflicht-Schlüssel vorhanden, kein Force-Push.
import { readFileSync } from 'node:fs';

const checks = [
  ['.github/workflows/pages.yml', ['name:', 'on:', 'permissions:', 'concurrency:', 'jobs:', 'build:', 'deploy:', 'needs: build', 'pages: write', 'id-token: write', 'persist-credentials: false']],
  ['backup/.github/workflows/mirror.yml', ['name:', 'on:', 'cron:', 'workflow_dispatch:', 'permissions:', 'jobs:', 'fail-fast: false', 'set -euo pipefail', 'MIRROR_TOKEN']],
];
let bad = 0;
for (const [file, keys] of checks) {
  const text = readFileSync(file, 'utf8');
  const problems = [];
  text.split('\n').forEach((l, i) => {
    if (l.includes('\t')) problems.push(`Zeile ${i + 1}: Tab`);
    const indent = l.match(/^ */)[0].length;
    if (l.trim() && indent % 2) problems.push(`Zeile ${i + 1}: ungerade Einrückung (${indent})`);
    if (/\s+$/.test(l)) problems.push(`Zeile ${i + 1}: Leerzeichen am Ende`);
  });
  for (const k of keys) if (!text.includes(k)) problems.push(`fehlt: ${k}`);
  const code = text.replace(/#.*$/gm, '');
  if (/--force|\+refs|git push.*\s-f\s/.test(code)) problems.push('Force-Push gefunden');
  console.log(`${file}: ${problems.length ? 'FEHLER\n  ' + problems.join('\n  ') : 'OK'}`);
  bad += problems.length;
}
process.exit(bad ? 1 : 0);
