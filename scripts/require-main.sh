#!/usr/bin/env bash
# Körs automatiskt före `npm run deploy` (predeploy).
# Production får bara deployas från branchen main, med rent arbetsträd
# och med alla commits pushade till origin/main.
set -euo pipefail

branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "main" ]; then
  echo "Stopp: du står på '$branch'. Production deployas bara från main." >&2
  echo "Merga till main först: git checkout main && git merge --ff-only $branch" >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Stopp: arbetsträdet har ocommittade ändringar. Committa eller stasha först." >&2
  exit 1
fi

git fetch -q origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "Stopp: main skiljer sig från origin/main. Kör git push (eller git pull) först." >&2
  exit 1
fi
