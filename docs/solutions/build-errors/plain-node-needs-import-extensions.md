---
title: A docs lib file fails under plain node when it imports a sibling without its extension
date: 2026-10-20
category: build-errors
module: docs
tags: [node, typescript, type-stripping, esm, imports, docs-scripts, tsx]
problem_type: module_resolution
---

## Symptom

A value import added to `docs/src/lib/releases.ts` (`'./repo'`) worked in
`next build` and the docs tests, but the markdown script, `generate:llms`
(`node scripts/llms.ts`), couldn't resolve it (roadie#572).

## Cause

Files in `docs/src/lib/` are bundled by Next and also run by scripts under
plain `node`, which strips the types but resolves ESM imports as written. A
relative import without its extension (`'./repo'`) works in Next and under
`tsx`, so running a script with `tsx` locally hides the failure.

## Fix

Import siblings with the `.ts` extension in any file a node script reaches:
`import { REPO_URL } from './repo.ts'`. `docs/tsconfig.json` sets
`rewriteRelativeImportExtensions`, so TypeScript accepts it. `import type`
lines are erased, so they don't need it.

## Check

Run the script the way CI does, with `node`, not `tsx`:

```bash
pnpm --filter docs generate:llms
node docs/scripts/check-changesets.ts
```
