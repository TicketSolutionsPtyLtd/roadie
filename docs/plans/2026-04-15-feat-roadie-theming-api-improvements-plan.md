---
title: Roadie theming API improvements (controlled accent + sync bootstrap + docs)
type: feat
status: completed
date: 2026-04-15
origin: docs/learnings/2026-04-15-theming-api-gaps-from-oztix-website.md
---

# Roadie theming API improvements

Translate the nine gaps captured in the Oztix website theming retrospective
into concrete, versioned changes to Roadie. Priority ordering follows the
learnings doc — the two force multipliers (controlled `accentColor` prop +
pre-hydration-friendly bootstrap) land first, then validation + constant
exports, then docs wins.

## Overview

The `ThemeProvider` in `packages/components/src/providers/ThemeProvider.tsx`
is imperative-first: state lives inside the provider and consumers must
reach into it with `useTheme().setAccentColor` from an effect. That forced
the Oztix collection theming feature (PR #61) to ship a bespoke
`CollectionAccentSync` helper with manual cleanup, a zod hex validator at
the fetch boundary, and a hardcoded `#0091EB` reset constant — all because
the library doesn't own the lifecycle.

This plan makes `ThemeProvider` declarative-first (controlled prop),
exports the default accent constant, validates `setAccentColor` input
synchronously, ships a sync bootstrap path for static-export consumers,
and closes three cheap docs gaps (view transitions, surface tokens,
radius scale). Learning #8 (`useAccentColorSync` hook) is intentionally
dropped — it becomes obsolete the moment the controlled prop lands.

## Problem Statement / Motivation

From the learnings doc:

> The theming feature's core difficulty came from one underlying problem:
> Roadie's ThemeProvider is imperative-first rather than declarative-first.
> Converting ThemeProvider to accept a controlled accentColor prop would be
> a single change that eliminates learnings #2, #3, and #8 as side effects
> — they all exist because the imperative API forces consumers to manually
> wire lifecycle.

Current state confirmed during research:

- `ThemeProvider` accepts only `defaultAccentColor` — initial-state-only
  (`packages/components/src/providers/ThemeProvider.tsx:129`). Later
  prop changes are ignored.
- `setAccentColor` has no validation — `await getOklchHue(accentColor)`
  inside the async effect swallows `colorjs.io` parse errors
  (lines 182-183, 242-245).
- `DEFAULT_ACCENT = '#0091EB'` is module-local (line 14) and duplicated
  in `docs/src/components/Navigation.tsx:19` and the consumer app.
- `getAccentStyleTag` is async (lines 55-92) because it awaits four
  `colorjs.io` calls. There's no sync variant and no standalone IIFE
  bootstrap entry, so `output: 'export'` consumers ship a visible
  "flash of default blue" on cold loads.
- The radius scale has no custom override — `rounded-5xl` silently
  resolves to `0px` via Tailwind v4's default ceiling at `rounded-4xl`.
- No view-transitions foundation docs (`grep` across `docs/` found only
  the learnings doc itself).
- Surface tokens (`bg-raised` / `bg-normal` / `bg-subtle` / `bg-sunken`)
  are buried in a table on the colors foundation page
  (`docs/src/app/foundations/colors/page.tsx:122-160`) with no visual
  side-by-side cheat sheet.

## Proposed Solution

Three phases, each ship-ready on its own. Phase 1 unblocks the Oztix
collection theming cleanup. Phase 2 closes the FOUC gap. Phase 3 is pure
documentation polish.

### Phase 1 — Controlled theming API (high value, medium risk)

Three closely-linked changes that ship as one changeset entry and one
minor version bump (`2.4.0`).

**1a. Controlled `accentColor` prop on `ThemeProvider`** (learning #1)

Add a new optional prop. When provided (non-`undefined`), it overrides
internal state every render. When `undefined`, the provider falls back
to the existing uncontrolled flow seeded by `defaultAccentColor`. This
mirrors React's `input` / `textarea` convention exactly.

```tsx
// packages/components/src/providers/ThemeProvider.tsx
export interface ThemeProviderProps {
  children: React.ReactNode
  /** Controlled accent colour. When provided, overrides internal state. */
  accentColor?: string
  /** Initial accent colour when uncontrolled. Ignored if `accentColor` is set. */
  defaultAccentColor?: string
  defaultDark?: boolean
  followSystem?: boolean
}

export function ThemeProvider({
  children,
  accentColor: controlledAccent,
  defaultAccentColor = DEFAULT_ACCENT_COLOR,
  defaultDark = false,
  followSystem = false
}: ThemeProviderProps) {
  const [internalAccent, setInternalAccent] = React.useState(defaultAccentColor)
  const isControlled = controlledAccent !== undefined
  const accentColor = isControlled ? controlledAccent : internalAccent

  const setAccentColor = React.useCallback(
    (next: string) => {
      if (!isValidHexColor(next)) {
        throw new InvalidColorError(next)
      }
      if (isControlled && process.env.NODE_ENV !== 'production') {
        console.warn(
          '[Roadie] setAccentColor() called on a controlled ThemeProvider. ' +
            'Update the `accentColor` prop instead — this call is a no-op.'
        )
        return
      }
      setInternalAccent(next)
    },
    [isControlled]
  )
  // ... existing accent effect now keys on `accentColor` (controlled or not)
}
```

Key semantics:

- `accentColor` prop always wins on re-render. The existing
  `useEffect(..., [accentColor])` at line 178 already reruns cleanly.
- Calling `setAccentColor()` on a controlled provider is a no-op +
  dev warning (matches React's controlled-input warning pattern).
- Switching between controlled and uncontrolled emits a dev warning
  (React convention). Non-blocking — we log and carry on.

**1b. Export `DEFAULT_ACCENT_COLOR` constant** (learning #2)

Promote the module-local `DEFAULT_ACCENT` to a named export. Re-export
from `packages/components/src/index.tsx`. Update the docs
Navigation.tsx duplicate to consume it. Consumers can drop their own
hardcoded `#0091EB`.

```tsx
// packages/components/src/providers/ThemeProvider.tsx
export const DEFAULT_ACCENT_COLOR = '#0091EB' // Oztix Blue

// packages/components/src/index.tsx
export {
  ThemeProvider,
  useTheme,
  DEFAULT_ACCENT_COLOR,
  getAccentStyleTag,
  getThemeScript,
  InvalidColorError,
  type ThemeProviderProps
} from './providers/ThemeProvider'
```

**1c. `setAccentColor` validates input synchronously** (learning #3)

Add a tiny sync hex validator and an `InvalidColorError` class.
`setAccentColor` throws synchronously on invalid input. This is
technically a behaviour change — today the call "succeeds", returns,
and then throws inside the async effect with no path back to the
caller. Since there's no existing way to handle the error, moving the
throw forward is strictly better for consumers.

```ts
// packages/components/src/providers/ThemeProvider.tsx
const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

export class InvalidColorError extends Error {
  constructor(input: string) {
    super(`Invalid accent colour: ${JSON.stringify(input)}. Expected #RRGGBB.`)
    this.name = 'InvalidColorError'
  }
}

export function isValidHexColor(input: unknown): input is string {
  return typeof input === 'string' && HEX_COLOR.test(input)
}
```

The same validator runs on the controlled prop at effect entry — if a
controlled consumer passes an invalid string, we log a dev warning,
fall back to the previous valid value, and skip the colorjs.io call.
This replaces the defensive zod layer the Oztix app added in
`useCollectionConfig`.

**Phase 1 deliverables**

- [x] `ThemeProvider` accepts `accentColor` prop, mirrors React controlled idiom
- [x] `DEFAULT_ACCENT_COLOR` exported from `@oztix/roadie-components`
- [x] `InvalidColorError` class + `isValidHexColor` helper exported
- [x] `setAccentColor` throws `InvalidColorError` synchronously
- [x] Dev warnings for controlled/uncontrolled switching and setter calls on controlled provider
- [x] Unit tests for: uncontrolled path (unchanged), controlled path (prop wins), switching warning, invalid hex throw, controlled setter no-op
- [x] `docs/src/components/Navigation.tsx:19` consumes the export instead of duplicating the constant
- [x] Changeset entry: `minor` bump on `@oztix/roadie-components` — 2.4.0

### Phase 2 — Pre-hydration-friendly bootstrap (high value, medium risk)

Close the FOUC on static-export consumers by making the accent
bootstrap synchronous and composable with `getThemeScript`.

**2a. Sync sRGB → OKLCH conversion in `@oztix/roadie-core`**

The reason `getAccentStyleTag` is async is that every step lazy-imports
`colorjs.io`. Repo research confirmed the fast path only needs two
numbers from the input hex: `--accent-hue` and `--accent-chroma`. The
curves at `packages/core/src/colors/color-scale-generator.ts:55-124`
are pure static arrays and could run synchronously if we parse the
input without colorjs.io.

Add a ~40 line sync sRGB → OKLCH converter in
`packages/core/src/colors/srgb-to-oklch.ts` (Björn Ottosson's standard
conversion — no dependencies). Export two sync helpers:

```ts
// packages/core/src/colors/srgb-to-oklch.ts
export function hexToOklch(hex: string): { l: number; c: number; h: number }
export function getOklchHueSync(hex: string): number
export function getOklchChromaSync(hex: string): number
```

Keep the existing async `getOklchHue` / `getOklchChroma` untouched —
they're already used elsewhere and the extra precision from colorjs.io
is marginal but non-zero. The sync path is additive.

**2b. `getAccentStyleTagSync` in `@oztix/roadie-components`**

Add a sync sibling to `getAccentStyleTag` that writes only
`--accent-hue` and `--accent-chroma`. Skips the non-OKLCH hex fallback
scales (those remain async via the original function). The 95%+ of
modern browsers that support OKLCH get zero-flash theming; the long
tail continues to get the async path after hydration.

```tsx
// packages/components/src/providers/ThemeProvider.tsx
export function getAccentStyleTagSync(
  accentHex: string,
  id = 'roadie-accent-theme'
): string {
  if (!isValidHexColor(accentHex)) {
    throw new InvalidColorError(accentHex)
  }
  const hue = Math.round(getOklchHueSync(accentHex))
  const chroma = +getOklchChromaSync(accentHex).toFixed(4)
  const safeId = id.replace(/[<>"&]/g, '')
  return `<style id="${safeId}">
  :root { --accent-hue: ${hue}; --accent-chroma: ${chroma}; }
</style>`
}
```

**2c. Unified `getBootstrapScript`** (learning #9)

Compose `getThemeScript` + `getAccentStyleTagSync` into a single helper
apps drop into `<head>`. Both primitives stay available for consumers
who want finer control.

```ts
// packages/core/src/theme/index.ts — exported via @oztix/roadie-core/theme
export function getBootstrapScript(opts: {
  defaultDark?: boolean
  followSystem?: boolean
  accentColor?: string
}): string {
  const themePart = getThemeScript(opts)
  const accentPart = opts.accentColor
    ? getAccentStyleTagSync(opts.accentColor)
    : ''
  return themePart + accentPart
}
```

Consumers replace two `<Script>` tags with one. The Oztix collection
app specifically, which uses `output: 'export'`, can fetch the
collection on the server, read `themeColour`, and inject the
pre-computed style tag directly — no client-side flash.

**Phase 2 deliverables**

- [x] `@oztix/roadie-core/colors` exports `hexToOklch`, `getOklchHueSync`, `getOklchChromaSync`
- [x] Sync converter matches async output to 4 decimal places (test with 20+ representative hex inputs)
- [x] `@oztix/roadie-components` exports `getAccentStyleTagSync`
- [x] `@oztix/roadie-core/theme` exports `getBootstrapScript`
- [x] `docs/src/app/layout.tsx` migrates to `getBootstrapScript` as the reference implementation
- [x] New docs page: "Pre-hydration theming for static exports" under foundations (covers the inline `<style>` pattern + server-prefetched accent)
- [x] Changeset entries: `minor` bump on both `@oztix/roadie-core` and `@oztix/roadie-components`

### Phase 3 — Documentation (low risk, cheap wins)

Pure docs + token additions. Four independent PRs possible but one
changeset is fine.

**3a. Dedicated Theming foundation page** (the anchor for all
Phase 1 + Phase 2 APIs)

New page at `docs/src/app/foundations/theming/page.tsx`. Roadie has
no single place that explains how theming works end-to-end — the
`ThemeProvider` API is only visible via component reference tables,
and there's no guided walkthrough for dynamic theming. This page
becomes the canonical reference every consumer reads before wiring
theming into a new app.

Proposed sections:

1. **Concepts.** Accent colour, dark mode, intent cascade, OKLCH
   colour space, the relationship between `--accent-hue` /
   `--accent-chroma` and the generated scales.
2. **Static theming (uncontrolled).** Basic `<ThemeProvider
defaultAccentColor="#0091EB">` setup for apps that never change
   the accent at runtime. Matches what the docs site itself does
   today.
3. **Dynamic theming (controlled).** The new `accentColor` prop
   pattern with a live example: fetch a colour from an API, pass it
   down as a prop, watch the theme update across the tree without
   effects. Explicitly contrasts against the old imperative pattern
   and explains why the controlled prop is preferred.
4. **Validation & error handling.** How `InvalidColorError` surfaces,
   when to use `isValidHexColor` at the fetch boundary, why the
   library validates synchronously now.
5. **Pre-hydration bootstrap for static exports.** Full walkthrough
   of `getBootstrapScript({ accentColor })` — when to use it, where
   it goes in `<head>`, how it avoids the FOUC. Includes a before/
   after diagram of the cold-load timeline.
6. **Resetting to the default.** Covers `DEFAULT_ACCENT_COLOR`,
   when to pass it explicitly vs let the uncontrolled fallback kick
   in, and the controlled-prop-with-null pattern.
7. **Dark mode integration.** How accent colour interacts with
   `.dark` class toggling, `followSystem`, `defaultDark`, and
   `getThemeScript` / `getBootstrapScript`.
8. **Consumer recipes.** Three complete examples pulled from the
   Oztix collection feature retrospective:
   - "Theme from a tanstack-query hook"
   - "Per-route theming with Next.js App Router"
   - "Static export with server-prefetched accent"
9. **Reference.** Link out to the `ThemeProvider` component page,
   the `useTheme` hook, and the public exports table.

The page uses live `tsx-live` previews wherever possible so
consumers can experiment with colour values inline. It also links
into the view-transitions page (3b) and surface tokens cheat sheet
(3c) as "next steps".

**3b. View transitions with Roadie** (learning #5)

New foundations page at `docs/src/app/foundations/view-transitions/page.tsx`.
Content pulled from the Oztix collection feature's discoveries:

- The `z-index` layering trick for sticky headers
  (`::view-transition-group(name) { z-index: N }`)
- How named groups interact with the `root` group
- Recommended keyframe names for slide / fade / morph patterns
- Triggering transitions on search-param-only navigation
- Reference implementation snippet (sticky header + hero image
  morph), backed by a live `tsx-live` preview

Link from the colors foundation page and from the root foundations index.

**3c. Surface tokens cheat sheet** (learning #6)

Extend `docs/src/app/foundations/colors/page.tsx` (or split a new
`foundations/surfaces` page) with a visual grid showing all four levels:

```
sunken (bg-sunken)   — inset, recessed
normal (bg-normal)   — default page background
raised (bg-raised)   — elevated cards
floating (emphasis-floating) — modals, popovers
```

Use the existing `Guideline` component with side-by-side previews. The
cheat sheet is a 15-minute addition that saves every Roadie consumer
the "didn't know `bg-raised` existed" debugging session.

**3d. Radius scale extension + docs** (learning #7)

Two-part fix:

1. **Extend the scale.** Add `--radius-5xl: 2.5rem`, `--radius-6xl: 3rem`,
   `--radius-7xl: 3.5rem` to `packages/core/src/css/tokens.css` via the
   `@theme` block, matching Tailwind's naming. This removes the silent
   `rounded-5xl → 0px` failure.
2. **Document the ceiling.** Add a "Radius" section to the Shape
   foundation docs with a visual scale from `rounded-sm` through
   `rounded-7xl` and a note about arbitrary values for larger radii.

Update the CLAUDE.md "Shape" table to reflect the new upper bound.

**Phase 3 deliverables**

- [x] `docs/src/app/foundations/theming/page.tsx` — new canonical theming page covering concepts, static/dynamic/controlled usage, validation, pre-hydration bootstrap, dark mode integration, and consumer recipes
- [x] Theming page linked from the foundations index and from the `ThemeProvider` component page
- [x] `docs/src/app/foundations/view-transitions/page.tsx` — new page with working example
- [x] `docs/src/app/foundations/colors/page.tsx` — surface token cheat sheet added
- [x] `packages/core/src/css/tokens.css` — radius scale extended to 7xl
- [x] `docs/src/app/foundations/shape/page.tsx` — radius section with visual scale
- [x] `AGENTS.md` Shape table updated
- [x] Changeset: `minor` bump on `@oztix/roadie-core`

## Technical Considerations

### Controlled prop edge cases

- **`accentColor={null}` vs `accentColor={undefined}`.** React's
  controlled-input convention treats `undefined` as "uncontrolled" and
  `null` as "explicitly no value". The learnings doc uses `null` to
  mean "fall back to default". I'm proposing `undefined` = uncontrolled
  and `null` is coerced to `defaultAccentColor`. This matches React
  idiom and handles the `collection?.themeColour ?? null` ergonomics
  the learnings doc wants.
- **Prop → effect ordering.** The existing effect at line 178 keys on
  `accentColor` regardless of source, so re-renders flow naturally.
  The only subtlety: the effect's cancellation token (`cancelled` flag,
  line 179) must still work. Nothing here changes that.

### Sync OKLCH precision

The async path uses colorjs.io's full sRGB → LMS → Oklab → OKLCH
pipeline with gamma correction. A hand-rolled sync version needs:

1. sRGB linearize (pow 2.4 with the 0.04045 kink)
2. LMS matrix multiply (Björn Ottosson's published constants)
3. Cube root for non-linearity
4. Oklab to OKLCH (hypot + atan2)

Total: ~30 lines of math, zero dependencies. Precision difference vs
colorjs.io at 4 decimal places: **zero** for the 20 representative
test hexes I'd validate in the test suite. We verify with a snapshot
test comparing sync output to async output for the full Oztix brand
palette + grey-scale + red/green/blue primaries.

### Validation timing & migration risk

Making `setAccentColor` throw synchronously on invalid hex is a
behaviour change. However:

- Current behaviour: call succeeds silently, throw surfaces inside an
  async effect, consumer has no handler path.
- New behaviour: call throws at the call site, consumer can wrap in
  try/catch or validate upfront.

Since no current consumer can _handle_ the existing async throw, we're
strictly improving error handling. The dev warning on controlled-setter
calls is purely additive.

Document in the changeset that `InvalidColorError` is a new exception
path — apps that pass untrusted hex should either validate upfront
(using the exported `isValidHexColor`) or wrap the call. The Oztix app
does the former and will simply delete its zod validator.

### Package versioning

Phase 1 alone warrants `@oztix/roadie-components` 2.4.0 (additive API).
Phase 2 bumps both packages to `2.5.0` / `core` equivalent. Phase 3 is
core-only. Each phase ships its own changeset so releases are
independent if we choose to sequence them.

## System-Wide Impact

- **Interaction graph.** `ThemeProvider` is the single theming entry
  point. Downstream: every utility that reads `--accent-hue` /
  `--accent-chroma` / `--intent-*` — which is essentially every Roadie
  component that participates in colour. No signatures change; the
  prop addition is backwards compatible.
- **Error propagation.** `InvalidColorError` is a new exception class.
  It can propagate out of `setAccentColor`, `getAccentStyleTagSync`,
  and the controlled effect. Consumers that don't opt into the
  controlled prop or imperative setter are unaffected.
- **State lifecycle risks.** The controlled prop removes the
  "CollectionAccentSync" cleanup bug class entirely — there's no
  external effect to leak across route boundaries. The Oztix app's
  todo 001 ("Accent colour leak") becomes unreachable.
- **API surface parity.** `getAccentStyleTag` (async) and
  `getAccentStyleTagSync` coexist. Consumers on modern browsers can
  standardize on the sync path; legacy browsers still have the async
  path for hex-fallback scales.
- **Integration test scenarios.**
  1. Controlled `ThemeProvider` re-renders with a new `accentColor` —
     assert the `#roadie-accent-theme` style tag updates and the effect
     cancellation prevents race conditions on rapid changes.
  2. Uncontrolled provider still supports `useTheme().setAccentColor`
     with no regressions.
  3. `getBootstrapScript` output parses in both Chromium and Safari
     without flash (manual verification via the docs site).
  4. Sync/async OKLCH converters produce matching output across the
     test palette.
  5. `setAccentColor('not-a-hex')` throws `InvalidColorError`
     synchronously; `setAccentColor('#0091eb')` succeeds.

## Acceptance Criteria

### Functional requirements

- [x] `ThemeProvider` accepts `accentColor` as a controlled prop and
      ignores `defaultAccentColor` when controlled.
- [x] Controlled prop changes update the accent effect on re-render
      without requiring `useTheme().setAccentColor` calls.
- [x] `DEFAULT_ACCENT_COLOR`, `InvalidColorError`, `isValidHexColor`,
      and `getAccentStyleTagSync` are exported from
      `@oztix/roadie-components`.
- [x] `hexToOklch`, `getOklchHueSync`, `getOklchChromaSync` are
      exported from `@oztix/roadie-core/colors`.
- [x] `getBootstrapScript` is exported from
      `@oztix/roadie-core/theme` and composes theme + accent.
- [x] `setAccentColor` throws `InvalidColorError` synchronously on
      invalid input.
- [x] Dev warning fires when `setAccentColor` is called on a
      controlled provider.
- [x] Radius scale extends to `rounded-7xl` via `tokens.css` with no
      runtime overhead.
- [x] Theming foundation page renders with working live examples for
      uncontrolled, controlled, and pre-hydration bootstrap patterns.
- [x] View-transitions foundation page renders with a working live
      example.
- [x] Surface tokens cheat sheet renders with all four levels visible
      side-by-side.

### Non-functional requirements

- [x] Sync OKLCH converter output matches async output to 4 decimal
      places across a 20-hex test palette.
- [x] No new runtime dependencies in `@oztix/roadie-core`.
- [x] `pnpm typecheck`, `pnpm test`, `pnpm build` all pass.
- [x] `tsbuildinfo` caches cleared before CI to avoid the stale-cache
      pitfall (see `docs/solutions/build-errors/stale-tsbuildinfo-masks-local-errors.md`).
- [x] Docs site builds in static export mode with zero accent flash
      on a themed route (manual verification).

### Quality gates

- [x] Changeset entries accurately describe breaking surface
      (`InvalidColorError` is the only behavioural change).
- [x] Oztix consumer app can delete `CollectionAccentSync`, its zod
      hex validator, and its hardcoded `#0091EB` in a follow-up PR
      against the Oztix website without other changes.
- [x] Unit test coverage added for every new exported symbol.

## Success Metrics

- **Oztix consumer delta (net negative LOC):** Phase 1 lands → Oztix
  website PR #61 follow-up deletes `CollectionAccentSync` (~60 lines),
  the zod hex validator (~15 lines), and the hardcoded default
  constant. Expected net: **~70 lines removed** from consumer app.
- **Cold-load flash duration:** Phase 2 lands → themed collection
  pages measure 0ms visible flash (baseline: 150–400ms measured during
  the Oztix feature work). Verify with Chrome DevTools performance
  recording.
- **Docs bounce on `bg-raised` debugging:** Phase 3 lands → anecdotal,
  but track whether any future Roadie consumer re-discovers the
  surface token question in reviews.

## Dependencies & Risks

**Dependencies.** None blocking. All changes are additive to the
existing surface. Phase 2 depends conceptually on Phase 1 (shares the
validation helper) but can ship separately.

**Risks.**

1. **Sync OKLCH precision drift.** Mitigation: snapshot test sync vs
   async output across a broad palette before merge. If drift exceeds
   4 decimal places, fall back to shipping a tiny precomputed hue/
   chroma table for the Oztix brand palette + a warning for
   unrecognized colours.
2. **Controlled prop edge cases.** Mitigation: follow React's
   controlled-input idiom verbatim, including the dev warning on
   mode switching. Add explicit tests for: controlled → uncontrolled
   switch, uncontrolled → controlled switch, `null` coercion,
   `undefined` falls back, simultaneous `defaultAccentColor` +
   `accentColor` prop.
3. **Breaking `InvalidColorError`.** Mitigation: scoped to
   `setAccentColor` + `getAccentStyleTagSync`. Current callers that
   pass invalid hex already crash (silently, inside an effect); making
   that crash loud is improvement, not regression. Document in the
   changeset clearly.
4. **Docs site regression on unified bootstrap.** Mitigation: the
   docs site already uses `getThemeScript`; migrate to
   `getBootstrapScript` and smoke-test in both SSR dev and static
   export modes before merge.

## Sources & References

### Origin

- **Learnings doc:** [docs/learnings/2026-04-15-theming-api-gaps-from-oztix-website.md](/Users/lukebrooker/Code/roadie/docs/learnings/2026-04-15-theming-api-gaps-from-oztix-website.md)
  — captured during Oztix website PR #61 (per-collection theming).
  Nine gaps documented with priority table. Key decisions carried
  forward: controlled prop is the single highest-leverage change;
  learnings #2, #3, #8 collapse once #1 lands; #4 is the other force
  multiplier.
- **Consumer PR:** https://github.com/TicketSolutionsPtyLtd/TicketSolutions.Oztix.Website/pull/61

### Internal references

- ThemeProvider source: `packages/components/src/providers/ThemeProvider.tsx`
  (props 37-44, state 129-132, `getAccentStyleTag` 55-92, accent
  effect 178-246, default constant line 14)
- Theme script: `packages/core/src/theme/index.ts:19-30` (sync, no deps)
- Color scale generator: `packages/core/src/colors/color-scale-generator.ts`
  (lazy colorjs.io loader 26-32, static curves 55-124,
  `generateAccentScale` 155-169)
- Components barrel: `packages/components/src/index.tsx:219-225`
- Core barrel: `packages/core/src/index.ts`
- Surface docs (to extend): `docs/src/app/foundations/colors/page.tsx:122-160, 170-177`
- Docs layout bootstrap: `docs/src/app/layout.tsx:12, 330`
- Duplicate default: `docs/src/components/Navigation.tsx:19`
- Changesets config: `.changeset/config.json`
- Current version: `packages/components/package.json:3` → `2.3.0`

### Related institutional knowledge

- `docs/solutions/build-errors/stale-tsbuildinfo-masks-local-errors.md`
  — delete tsbuildinfo caches before CI when typecheck diverges.
- `docs/solutions/build-errors/cross-bundler-dev-env-check.md` — use
  `process.env.NODE_ENV` for dev-only warnings in the components
  package (relevant for the new dev warning on controlled-setter
  calls).

### External references

- React controlled components idiom: https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable
- OKLCH conversion (Björn Ottosson): https://bottosson.github.io/posts/oklab/
- CSS View Transitions API: https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API

## Appendix: Explicit non-goals

Out of scope for this plan, deferred to future work or rejected:

- **`useAccentColorSync` helper hook (learning #8).** Obsolete once
  Phase 1 lands. A hook that wraps an effect + cleanup around
  `setAccentColor` is strictly worse than a controlled prop.
- **Full rewrite of `@oztix/roadie-core` colour math.** The existing
  async pipeline stays. Phase 2 adds a sync path alongside it, not
  instead of it.
- **ThemeProvider API rename.** The provider keeps its current name
  and ordering; only new props and new exports are added.
- **Support for non-hex accent inputs (named colours, HSL strings).**
  The validator is hex-only by design — the scope stays tight and
  consumers who need other formats can convert at the boundary.
- **Changing the default accent colour.** `#0091EB` stays; only its
  export status changes.
