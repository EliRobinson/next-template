#!/usr/bin/env bash
# Decides whether a push needs the visual tests. Reads git's pre-push lines
# ("<local ref> <local sha> <remote ref> <remote sha>") on stdin.
# Exits 0 when the push changes a file that can move a baseline, 1 when not.
# When in doubt (no input, an unknown commit), it exits 0 so the tests run.
set -euo pipefail

cd "$(dirname "$0")/.."

# Components, the tests and their setup, and dependencies (a design system or
# Playwright bump changes pixels).
pattern='^(src/|tests/visual/|playwright-ct\.config\.ts$|scripts/visual-test\.sh$|package\.json$|pnpm-lock\.yaml$)'

saw_input=false
while read -r _ local_sha _ remote_sha; do
  saw_input=true

  # A deleted branch pushes no files.
  if [[ $local_sha =~ ^0+$ ]]; then
    continue
  fi

  # A new branch is compared from where it left main.
  if [[ $remote_sha =~ ^0+$ ]]; then
    base=$(git merge-base "$local_sha" origin/main 2>/dev/null) || exit 0
  else
    base=$remote_sha
  fi

  files=$(git diff --name-only "$base" "$local_sha" 2>/dev/null) || exit 0
  if grep -qE "$pattern" <<<"$files"; then
    exit 0
  fi
done

if [ "$saw_input" = false ]; then
  exit 0
fi
exit 1
