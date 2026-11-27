#!/usr/bin/env bash
# Simuliert die Spiegelung aus backup/.github/workflows/mirror.yml lokal gegen
# Bare-Repos (file:// statt https://). Die clone-/push-Befehle haben dieselbe Form
# wie im Workflow. Erwartung: Lauf 1 gelingt, Lauf 2 (nach umgeschriebener
# Historie in der Quelle) wird abgelehnt. Exit 0 nur, wenn beides zutrifft.
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

echo "== Lauf 2: nach Umschreiben (muss abgelehnt werden) =="
if ( mirror ); then
  echo "FEHLER: Lauf 2 wurde NICHT abgelehnt"; exit 1
fi
echo "OK: Push wurde abgelehnt, Backup unverändert."
exit 0
