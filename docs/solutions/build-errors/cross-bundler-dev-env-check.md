---
title: Dev-only warnings silently never fire in Next.js consumers because `import.meta.env.DEV` is Vite-only
date: 2026-04-14
category: build-errors
problem_type: bundler_compatibility
components:
  - packages/components
keywords:
  - import.meta.env
  - process.env.NODE_ENV
  - vite
  - next.js
  - webpack
  - tsdown
  - dev warnings
  - cross-bundler
severity: medium
related_files:
  - packages/components/src/components/Carousel/index.tsx
---

# `import.meta.env.DEV` is Vite-only

## Symptom

A library package authors its dev-only diagnostics behind `import.meta.env.DEV`:

```ts
function isDevEnvironment(): boolean {
  const meta = import.meta as unknown as { env?: { DEV?: boolean } }
  return meta.env?.DEV === true
}

useEffect(() => {
  if (!isDevEnvironment()) return
  if (autoPlay !== false && autoPlay < 2000) {
    console.warn('[Carousel] autoPlay delay < 2000ms may fail WCAG 2.2.1 timing.')
  }
}, [autoPlay])
```

Tests (vitest + jsdom) pass and the warnings fire as expected. The package gets built via tsdown and published. Consumers run the code and **none of the warnings ever appear in the browser console**, not even in development. The bug can go unnoticed for months because the warnings are only "supposed to fire" in specific scenarios — it's easy to assume nobody hit those scenarios, not that the check is always false.

## Root cause

`import.meta.env.DEV` is a **Vite-specific** extension to `import.meta`. Vite populates `env.DEV` / `env.PROD` / `env.MODE` via its own define-plugin pipeline. tsdown (which the Roadie components package uses to build) preserves `import.meta.env.DEV` as a live runtime lookup in the published dist — it does not replace it with a literal.

When a non-Vite consumer (Next.js, Webpack, Rollup, Parcel, esbuild without the Vite plugin) imports the package:

- `import.meta` exists (ESM runtime feature) but has **no `env` property**
- `import.meta.env?.DEV` evaluates to `undefined`
- `undefined === true` → `false`
- Every `isDevEnvironment()` call returns `false` regardless of the consumer's `NODE_ENV`

Result: every dev warning, assertion, and diagnostic in the library is silently dead code for every non-Vite consumer. In Roadie's case that included the docs site itself, which is Next.js.

## Fix

Switch the dev check to `process.env.NODE_ENV`, which every mainstream bundler replaces with a string literal at the consumer's build step:

```ts
// packages/components/src/components/Carousel/index.tsx

/**
 * Development-mode check that works across consumer bundlers.
 *
 * Uses `process.env.NODE_ENV` rather than `import.meta.env.DEV` because
 * the latter is Vite-specific — Next.js, Webpack, Rollup, and friends
 * don't populate it, so the dev-only warnings would never fire in those
 * consumer runtimes. Every mainstream bundler replaces
 * `process.env.NODE_ENV` with a string literal at build time; the
 * `typeof process` guard covers the case where a consumer bundler hasn't
 * shimmed `process` on the client. The minimal ambient `process`
 * declaration below keeps us from pulling `@types/node` into the
 * package-wide `types` array, which would otherwise leak Node-only
 * globals into DOM code.
 */
declare const process: { env?: { NODE_ENV?: string } } | undefined

function isDevEnvironment(): boolean {
  return (
    typeof process !== 'undefined' &&
    process?.env?.NODE_ENV !== 'production'
  )
}
```

Three subtleties:

1. **Typing `process` locally, not globally.** Adding `"node"` to `tsconfig.json`'s `types` array would pull the entire Node.js global namespace into the package. That leaks `Buffer`, `setImmediate`, `require`, `global`, etc. onto every DOM file and hides bugs where you accidentally reference a Node-only API that won't exist in the browser. The one-line `declare const process` gives you exactly enough typing for the env check and nothing more.

2. **`typeof process !== 'undefined'` guard.** In pure browser environments (no bundler shim at all), `process` is a runtime ReferenceError. The guard short-circuits before the `process.env?.NODE_ENV` lookup.

3. **Verify the dist.** After changing the check, grep the built output for the runtime pattern to confirm tsdown didn't inline the result. What you want to see:

   ```bash
   $ grep -o '.\{0,80\}typeof process.\{0,80\}' dist/Carousel.js
   …function T(){return typeof process<`u`&&process?.env?.NODE_ENV!==`production`}…
   ```

   If tsdown replaced `process.env.NODE_ENV` with a literal at its own build step, the consumer bundler has nothing to substitute and you're back to the same silent-always-false bug — just in the opposite direction. For tsdown + Rolldown the live check survives; other bundlers may need explicit config to opt out of define-replacement for the published output.

## Prevention

- **Whenever you add a dev-only code path in a library intended for cross-bundler consumers, grep `dist/` after building to confirm the check is preserved as a runtime lookup.** It takes five seconds and catches silent-dead-code regressions before publish.
- **Don't rely on `import.meta.env.*` unless your package targets Vite consumers exclusively.** Library authors should use `process.env.NODE_ENV` (with a guard) because every mainstream web bundler replaces it at the consumer build step.
- **When testing dev warnings under jsdom + Vitest, the warning will fire because Vitest ships Vite's `import.meta.env.DEV` support**. The green unit test does NOT prove the warning fires in a published consumer. Add a manual check: build the package, install it into a Next.js app (or the docs site), trigger the condition, and verify the warning actually shows in the browser console.
- **Avoid adding `"types": ["node"]` just to satisfy `process.env.NODE_ENV` typing.** The local `declare const process` pattern keeps Node globals out of the DOM file surface.

## Related files

- `packages/components/src/components/Carousel/index.tsx` — `isDevEnvironment()` implementation with the cross-bundler pattern.
- Any future package-level dev-only diagnostics should reuse the same helper (or a shared `isDev` export) rather than re-implementing the check and risking drift.
