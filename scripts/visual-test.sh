#!/usr/bin/env bash
# Runs the screenshot regression tests (playwright-ct.config.ts) against a
# browser inside the official Playwright Docker image, so every machine renders
# the same pixels. The test runner stays on the host with its own node_modules;
# only the browser is remote. Arguments pass through to `playwright test`, e.g.
# --update-snapshots.
#
# Already on Linux with the browsers installed (the Playwright image in CI)?
# Set VISUAL_NATIVE=1 to skip Docker.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ "${VISUAL_NATIVE:-}" = "1" ]; then
  exec pnpm exec playwright test -c playwright-ct.config.ts "$@"
fi

if ! docker info >/dev/null 2>&1; then
  echo "Visual tests need Docker. Start Docker, then run this again." >&2
  exit 1
fi

# The image and server must match the installed @playwright/test exactly.
version=$(node -p "require('@playwright/test/package.json').version")

container=$(docker run -d --rm --init --ipc=host -p 127.0.0.1::3000 \
  --user pwuser --workdir /home/pwuser \
  "mcr.microsoft.com/playwright:v${version}-noble" \
  /bin/sh -c "npx -y playwright@${version} run-server --port 3000 --host 0.0.0.0")
trap 'docker stop "$container" >/dev/null 2>&1 || true' EXIT

port=$(docker port "$container" 3000/tcp | head -n1 | sed 's/.*://')

for _ in $(seq 1 120); do
  if docker logs "$container" 2>&1 | grep -q 'Listening on'; then
    break
  fi
  sleep 1
done
if ! docker logs "$container" 2>&1 | grep -q 'Listening on'; then
  echo "The Playwright browser server did not start. Its log:" >&2
  docker logs "$container" >&2
  exit 1
fi

# <loopback> lets the remote browser reach the component server on this host.
PW_TEST_CONNECT_WS_ENDPOINT="ws://127.0.0.1:${port}/" \
PW_TEST_CONNECT_EXPOSE_NETWORK='<loopback>' \
  pnpm exec playwright test -c playwright-ct.config.ts "$@"
