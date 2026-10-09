#!/usr/bin/env bash
# Renders the visual test baselines in the Playwright image CI's browser jobs
# run in, on CI's amd64, since pixels differ between machines. Extra arguments
# go to Vitest, such as -t 'date-picker' to update some of them.
set -euo pipefail

repo=$(git rev-parse --show-toplevel)
playwright=$(node -p "require('$repo/package.json').devDependencies.playwright")
node_version=$(tr -d 'v\n' < "$repo/.nvmrc")

docker run --rm --ipc=host --platform linux/amd64 \
  -v "$repo":/repo \
  -v roadie-screenshots-pnpm-store:/pnpm-store \
  -e NODE_VERSION="$node_version" \
  -w /work \
  "mcr.microsoft.com/playwright:v$playwright-noble" \
  bash -euo pipefail -c '
    curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz" |
      tar -xJ --strip-components=1 -C /usr/local
    tar -C /repo --exclude=node_modules --exclude=.git --exclude=dist \
      --exclude=.turbo --exclude=.next --exclude=.vitest -cf - . | tar -xf -
    corepack enable
    pnpm config set store-dir /pnpm-store
    CI=true pnpm install --frozen-lockfile
    cd packages/components
    CI=true ROADIE_VISUAL=1 ROADIE_BROWSERS=chromium \
      pnpm exec vitest run --project "browser visual" --update "$@"
    find src -path "*/__screenshots__/visual.browser.test.tsx/*-linux.png" \
      -exec cp --parents {} /repo/packages/components/ \;
  ' update-screenshots "$@"
