---
title: '`preserveSymlinks` hides re-exported dependency types under pnpm'
date: 2026-09-11
category: build-errors
problem_type: module_resolution
components:
  - tsconfig.base.json
keywords:
  - typescript
  - pnpm
  - preserveSymlinks
  - has no exported member
severity: medium
---

# `preserveSymlinks` hides re-exported dependency types under pnpm

## Symptom

tsc reports "has no exported member" for something the package clearly
exports, such as `QueryClient` from `@tanstack/react-query` 5.102 or later.

## Root cause

`preserveSymlinks: true` makes tsc resolve each package from its symlinked
`node_modules/<pkg>` path. pnpm's isolated linker puts no sibling dependencies
there, so `export * from '<dep>'` in the package's `.d.ts` resolves to nothing.

## Fix

Never set `preserveSymlinks` in Roadie. PR #126 removed it from
`tsconfig.base.json`.
