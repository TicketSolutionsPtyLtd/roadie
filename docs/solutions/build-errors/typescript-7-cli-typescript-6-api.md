---
title: '`tsc` is TypeScript 7, but `import "typescript"` is TypeScript 6'
date: 2026-11-04
category: build-errors
problem_type: toolchain_split
module: typecheck
tags:
  - typescript
  - tsc
  - tsdown
  - react-docgen-typescript
  - vue-tsc
  - typescript-eslint
severity: medium
related_files:
  - package.json
  - packages/core/scripts/manifest/exports.ts
  - packages/widgets/package.json
  - .vscode/settings.json
---

# `tsc` is TypeScript 7, but `import "typescript"` is TypeScript 6

## What's set up

TypeScript 7 is a native compiler with no `ts.createProgram`-style JavaScript
API (a stable one is due in 7.1 or later). Several tools here still need that API:

- tsdown's `.d.ts` emit (rolldown-plugin-dts picks its `tsc` generator from
  whatever `typescript` resolves to)
- the manifest script (`packages/core/scripts/manifest/`) and
  react-docgen-typescript, which build the props tables the docs read
- `scripts/lib/source-comments.mjs`
- `@typescript-eslint/parser`, which caps its peer at `<6.1.0`
- `vue-tsc`, which typechecks widgets

So the devDependencies follow TypeScript's side-by-side recipe:

```json
"typescript": "npm:@typescript/typescript6@6.0.2",
"typescript-7": "npm:typescript@7.0.2"
```

`@typescript/typescript6` re-exports `typescript@^6` (6.0.3) and ships its
CLI as `tsc6`, so the only `tsc` bin is TypeScript 7's. Every package's
`typecheck` script runs TypeScript 7, except widgets, whose `vue-tsc` stays
on 6. Emitted `.d.ts` and `roadie.manifest.json` still come from TypeScript 6,
so the upgrade changed neither.

## Gotchas

- **A `tsc` from an older install wins.** A package's own `node_modules/.bin`
  comes before the root's on `PATH`, so until `pnpm install` relinks it, `tsc`
  there is still TypeScript 6. If `pnpm exec tsc --version` prints 6 in a
  package after an install, delete that package's `node_modules/.bin/tsc` and
  `tsserver`.
- **Don't bump `typescript` to 7.** TypeScript 7's `typescript` export holds
  only its version, so the manifest script, `scripts/lib/source-comments.mjs`,
  react-docgen-typescript, typescript-eslint, and vue-tsc stop working, and
  tsdown switches `.d.ts` emit to its experimental `tsgo` generator, which
  can't emit widgets' Vue types. Move it only when those tools support the
  TypeScript 7.1 API.
- **The editor runs TypeScript 6.** The alias has no `tsserver.js`, so
  `.vscode/settings.json` points `typescript.tsdk` at the real package pnpm
  hoists to `node_modules/.pnpm/node_modules/@typescript/old/lib`.
- **Run the old compiler with `pnpm exec tsc6`**, for example to compare
  diagnostics. The codes and positions match, but TypeScript 7 orders union
  members in messages differently (`stableTypeOrdering`), and its overload
  errors explain the last overload, not the first.
