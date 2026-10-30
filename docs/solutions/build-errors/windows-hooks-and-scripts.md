---
title: The pre-push hook, test:gated and preview failed on Windows while passing on macOS and Linux
date: 2026-10-29
category: build-errors
module: scripts
tags: [windows, child-process, spawn, pnpm, oxlint, recast, line-endings, hooks]
problem_type: platform_compatibility
---

## Symptom

On Windows, the pre-push hook failed every push with 33 test failures in
files the change didn't touch: `skills/migrate/codemods/codemods.test.js`
and `eslint/oxlint-config.test.js`, plus the lint plugin's consumer tests
whenever `eslint/` changed. `pnpm test:gated` and `pnpm preview`
stopped at once with `spawn pnpm ENOENT`, and `pnpm lint` in `docs` said no
files matched `'**/*.{md,mdx}'`.

## Root cause

- Node can't start a `.cmd` shim without a shell, and pnpm and every
  `node_modules/.bin` entry is one on Windows. The scripts spawned `pnpm`,
  and the lint config tests spawned `node_modules/.bin/oxlint`, directly.
- Recast's `toSource()` ends lines with `os.EOL`, so on Windows the codemods
  wrote CRLF into LF files and their fixtures stopped matching.
- cmd keeps single quotes, so `eslint '**/*.{md,mdx}'` looked for a file
  whose name starts with a quote.
- Linking a folder with `symlinkSync` needs admin rights on Windows, and a
  Windows path in a generated `import` turns `\r` into a carriage return.
- Windows has no process groups and doesn't deliver outside signals, so
  `process.kill(-pid)` left the dev server running after the preview stopped.

## Fix

- `shimCommand(command, args)` in `scripts/lib/machine.mjs` returns how to
  start pnpm or npm: straight on macOS and Linux, or one command line with
  each argument quoted for cmd, run in a shell, on Windows. `killGroup` kills
  the child's tree with `taskkill /t /f` on Windows. The lint plugin's
  consumer tests reach it through `runShim` in `test/app.js`.
- The lint config and consumer tests run oxlint's own script with
  `process.execPath`, link folders as a `'junction'`, import the config by
  file URL, and compare paths with forward slashes.
- The codemods print with the source's own line ending.
- Package scripts quote globs with escaped double quotes, which both shells
  read.

## Prevention

Spawn a package binary through `process.execPath` and its script, or pnpm
through `shimCommand`, never by its bare name. Give a printer its line ending,
and quote globs in `package.json` scripts with double quotes.
