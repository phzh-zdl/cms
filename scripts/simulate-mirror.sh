#!/usr/bin/env bash
# Simuliert die Spiegelung aus backup/.github/workflows/mirror.yml lokal gegen
# Bare-Repos (file:// statt https://). Die clone-/push-Befehle haben dieselbe Form
# wie im Workflow. Erwartung: Lauf 1 gelingt, Lauf 2 (nach umgeschriebener
# Historie in der Quelle) wird mit non-fast-forward abgelehnt; danach wird die
# Wiederherstellung aus backup/README.md geprüft. Exit 0 nur, wenn alles zutrifft.
set -euo pipefail

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export GIT_AUTHOR_NAME=sim GIT_AUTHOR_EMAIL=sim@example.com
export GIT_COMMITTER_NAME=sim GIT_COMMITTER_EMAIL=sim@example.com
REPO=oer-dashboard

git init -q --bare -b main "$TMP/source.git"
git init -q --bare -b main "$TMP/backup.git"

git clone -q "$TMP/source.git" "$TMP/work" 2>/dev/null
cd "$TMP/work"
git checkout -q -b main
echo eins > a.txt; git add a.txt; git commit -q -m eins
echo zwei >> a.txt; git commit -q -am zwei
git tag v1
git push -q origin main --tags

mirror() {
  rm -rf "$TMP/mirror.git"
  git clone --mirror "file://$TMP/source.git" "$TMP/mirror.git"
  cd "$TMP/mirror.git"
  git push "file://$TMP/backup.git" \
    "refs/heads/*:refs/heads/${REPO}/*" \
    "refs/tags/*:refs/tags/${REPO}/*"
}

echo "== Lauf 1: normale Spiegelung (muss gelingen) =="
( mirror ) || { echo "FEHLER: Lauf 1 ist fehlgeschlagen"; exit 1; }
git --git-dir="$TMP/backup.git" for-each-ref --format='  %(refname)'

echo "== Historie in der Quelle umschreiben (amend + force) =="
cd "$TMP/work"
git commit -q --amend -m "zwei (umgeschrieben)"
git push -q --force origin main

echo "== Lauf 2: nach Umschreiben (muss mit non-fast-forward abgelehnt werden) =="
if OUT="$( ( mirror ) 2>&1 )"; then
  echo "$OUT"; echo "FEHLER: Lauf 2 wurde NICHT abgelehnt"; exit 1
fi
echo "$OUT"
if ! grep -q "non-fast-forward" <<<"$OUT"; then
  echo "FEHLER: Lauf 2 ist aus anderem Grund fehlgeschlagen (kein non-fast-forward)"; exit 1
fi
echo "OK: Push wurde als non-fast-forward abgelehnt, Backup unverändert."

echo "== Wiederherstellung (genau die Befehle aus backup/README.md, file:// statt https://) =="
# Quelle zurücksetzen auf einen kaputten Zustand: neuer Commit auf main
cd "$TMP/work"
echo kaputt > a.txt; git commit -q -am kaputt
git push -q --force origin main
EXPECTED="$(git --git-dir="$TMP/backup.git" rev-parse refs/heads/${REPO}/main)"
git clone -q "file://$TMP/backup.git" "$TMP/restore"
cd "$TMP/restore"
git push "file://$TMP/source.git" refs/remotes/origin/oer-dashboard/main:refs/heads/wiederherstellung
RESTORED="$(git --git-dir="$TMP/source.git" rev-parse refs/heads/wiederherstellung)"
if [ "$RESTORED" != "$EXPECTED" ]; then
  echo "FEHLER: wiederhergestellter Commit $RESTORED != gesicherter Commit $EXPECTED"; exit 1
fi
echo "OK: wiederhergestellter Branch zeigt auf den gesicherten Commit ($RESTORED)."
exit 0
