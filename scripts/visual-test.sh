#!/usr/bin/env bash
# Runs the screenshot regression tests (playwright-ct.config.ts) against a
# browser inside the official Playwright Docker image, so every machine renders
# the same pixels. The test runner stays on the host with its own node_modules;
# only the browser is remote. Arguments pass through to `playwright test`, e.g.
# --update-snapshots.
set -euo pipefail

cd "$(dirname "$0")/.."

run_tests() {
  pnpm exec playwright test -c playwright-ct.config.ts "$@"
}

# Already inside the Playwright image, which ships its browsers here.
if [ -d /ms-playwright ]; then
  run_tests "$@"
  exit
fi

if ! docker info >/dev/null 2>&1; then
  echo "Visual tests need Docker. Start Docker, then run this again." >&2
  exit 1
fi

# The image and server must match the installed @playwright/test exactly.
version=$(node -p "require('@playwright/test/package.json').version")

# The npm cache volume keeps `npx` from downloading Playwright on every run.
# It is mounted outside any home folder and opened up first, because Docker
# creates a new named volume owned by root. No --rm: a container that crashes
# must stay long enough to print its log. The trap removes it on every exit.
container=$(docker run -d --init --ipc=host -p 127.0.0.1::3000 \
  -v next-template-playwright-npm:/npm-cache \
  -e npm_config_cache=/npm-cache \
  "mcr.microsoft.com/playwright:v${version}-noble" \
  /bin/sh -c "chmod 777 /npm-cache && exec su pwuser -c 'npx -y playwright@${version} run-server --port 3000 --host 0.0.0.0'")
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT

port=$(docker port "$container" 3000/tcp | head -n1 | sed 's/.*://')

server_ready() {
  docker logs "$container" 2>&1 | grep -q 'Listening on'
}

server_running() {
  [ "$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null)" = "true" ]
}

for _ in $(seq 1 120); do
  if server_ready || ! server_running; then
    break
  fi
  sleep 1
done
if ! server_ready; then
  echo "The Playwright browser server did not start. Its log:" >&2
  docker logs "$container" >&2 || true
  exit 1
fi

# <loopback> lets the remote browser reach the component server on this host.
PW_TEST_CONNECT_WS_ENDPOINT="ws://127.0.0.1:${port}/" \
PW_TEST_CONNECT_EXPOSE_NETWORK='<loopback>' \
  run_tests "$@"
