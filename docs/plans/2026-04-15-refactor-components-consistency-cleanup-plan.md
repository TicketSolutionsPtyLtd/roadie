---
title: Components package consistency cleanup
type: refactor
status: active
date: 2026-04-15
---

# Components package consistency cleanup

Sweep the existing component surface for consistency, dead code, and Next.js friendliness before adding Avatar, Checkbox, Switch, Dialog, and Form from Base UI. The goal is not rewrites — every change is a small, targeted fix that removes a decision point or a copy-paste trap for the incoming components.

**Scope excludes:**

- Steps → Base UI migration. `@ark-ui/react/steps` stays. Steps is still included in the cross-cutting phases (Phosphor imports, checked-state token, export-pattern migration) where the Ark-vs-Base-UI question doesn't matter.
- SpotIllustration barrel export / package surface. Handled in a separate plan because the underlying question — "is SpotIllustration part of `@oztix/roadie-components` at all, or its own package?" — deserves its own decision.

## Enhancement summary

**Deepened on:** 2026-04-15 (initial deepening + technical review round)
**Sections enhanced:** Phase 3 (rewritten for `export * as Namespace` with per-file sub-component splits and subpath package exports), Phase overview table, "Why this matters now" framing, Cross-phase acceptance, Sources. Phase 10 Button clarification.

### Key improvements

1. **Single, committed subcomponent export strategy** — `export * as Namespace` (Pattern A, Base UI style) — replaces the current property-assignment form. Resolves the RSC client-reference-proxy issue that PR #38 worked around with a client-component wrapper.
2. **Per-file sub-component source layout** — each compound becomes a folder with one file per sub-component (`ComboboxRoot.tsx`, `ComboboxInput.tsx`, …) plus a `parts.ts` aggregator and a `index.ts` namespace re-export. Mirrors Base UI's on-disk source structure 1:1.
3. **Subpath package exports** — `@oztix/roadie-components/combobox`, `@oztix/roadie-components/button`, `@oztix/roadie-components/field`, etc. — become the canonical import form. The barrel stays for compatibility. Matches Base UI's consumer surface and bypasses Next.js barrel-file build cost entirely.
4. **Concrete research evidence** for the pattern choice — Next.js issue #51593, Dan Abramov's canonical comment, and Base UI 1.3.0 on-disk source verification.
5. **Passthrough collapse merged into the export migration** — under the new pattern, pure passthroughs become `export const Portal = ComboboxPrimitive.Portal` in their own `ComboboxPortal.tsx`, which is a natural step of the migration.
6. **Variant maps co-located with their subpath** — `buttonVariants` ships from `@oztix/roadie-components/button`, `cardVariants` from `/card`, etc. Consumers extending CVA get the variant map in the same namespace as the component.
7. **Permanent RSC canary page** — `docs/src/app/debug/rsc-smoke/page.tsx` becomes a first-class debug route that renders every compound's Root + at least one sub-component from a server component. CI builds the docs site and the canary fails the build if any compound regresses.
8. **Retired a follow-up from the previous plan** — Phase 2.5 (`/parts` subpath export) from `docs/plans/2026-04-14-feat-docs-and-compound-conventions-improvements-plan.md` is obsolete; the whole package becomes RSC-safe by construction.
9. **Deletable workaround** — `docs/src/components/PropsAccordion.tsx` was only needed because of the RSC proxy issue. After Phase 3 it can go.

### New considerations discovered

- **Pattern C (`Compound.Sub = SubFn`) is a confirmed breakage in Next.js server components**, not a theoretical one. Error: _"Cannot access .Foo on the server. You cannot dot into a client module from a server component."_ Every current Roadie compound trips this if used across the RSC boundary.
- **`export * as` creates real ESM namespace semantics** — each member is a separate client reference, which is why it works where property assignment fails. Base UI itself ships exactly `export * as Combobox from "./index.parts.js"` in its published build.
- **Barrel files hurt Next.js App Router build times.** Consumers importing `{ Button }` from the Roadie barrel force the Next.js compiler to walk every `'use client'` module transitively reachable from the barrel — even unused ones. Subpath imports scope the walk to one component. Next.js's [`optimizePackageImports`](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports) is a workaround for this exact problem; shipping subpaths makes the optimization automatic.
- **Per-file split gives HMR isolation.** Editing `ComboboxInput.tsx` only invalidates that module. In a single `parts.tsx`, every edit re-evaluates every sub-component. For Select (17 subs) and Combobox (16 subs) this is a real DX difference.
- **Type access from consumer code** works under namespaces — `type X = Combobox.RootProps` when the namespace is exported as both a value and a type. Edge cases use `ComponentProps<typeof Combobox.Root>`.
- **`displayName` per sub-function is load-bearing.** Each leaf file sets its own `displayName` to the dot-notation form (`'Combobox.Input'`) so `<PropsDefinitions>` renders correct headings.

## Why this matters now

Five new components are about to land from Base UI (Avatar, Checkbox, Switch, Dialog, Form). Each one will look at existing components as a template. Every inconsistency left in place today becomes five copies tomorrow. The specific traps the incoming components are most likely to inherit:

1. **Compound subcomponents that break in Next.js server components.** Every current compound uses `Compound.Subcomponent = SubcomponentFn` property assignment. Next.js issue [#51593](https://github.com/vercel/next.js/issues/51593) confirms this is broken across the RSC boundary.
2. **`'use client'` on presentational leaves** — Input/Textarea/Highlight are server-safe but marked client.
3. **Barrel-only imports force Next.js to walk the entire package graph.** Any consumer using `import { Button } from '@oztix/roadie-components'` pays for the whole package's `'use client'` modules being resolved, even if only Button is used.
4. **Phosphor import path drift** — 5 of 6 components use `@phosphor-icons/react`; only Carousel uses `/ssr`.
5. **`Object.assign + cast` skeleton** — `BASE_UI.md` still shows the deprecated Pattern B in its scaffolding example.
6. **`disabled` silently dropped by Field-integrated controls** — Select, RadioGroup, Combobox, Autocomplete all read `invalid` and `required` from Field context but none read `disabled`.
7. **HelperText/ErrorText duplicated 4×** — Field, Fieldset, RadioGroup, Select each ship their own. Only Field's is used in docs.

## Context & sources

### Originating review

This plan materialised from `/compound-engineering:ce:review` run on 2026-04-15 against the current state of `main`. The review dispatched four parallel agents covering convention audit, simplicity review, Next.js weighting, and learnings research. Findings from the review are cross-referenced below by their review IDs (B1–B6, Y1–Y7, M1–M8).

### Canonical references already in the repo

- `AGENTS.md` — styling/utility rules, Base UI wrapping contract, form control patterns
- `docs/contributing/BASE_UI.md` — canonical Base UI wrapping guide (has Pattern B skeleton bug — fixed in Phase 1)
- `docs/contributing/COMPOUND_PATTERNS.md` — current Pattern A mandate from commit `ba58fd6` (rewritten in Phase 3)
- `docs/contributing/COMPONENT_DOC_TEMPLATE.md` — docs structure (form controls explicitly exclude Intents section)
- `docs/solutions/build-errors/react-docgen-cva-literal-props.md` — CVA variant props must be inlined literal unions for docs extraction
- `docs/solutions/build-errors/cross-bundler-dev-env-check.md` — dev warnings use `process.env.NODE_ENV` with `typeof process` guard
- `docs/solutions/build-errors/stale-tsbuildinfo-masks-local-errors.md` — clear `.tsbuildinfo` before trusting `pnpm typecheck`

### External evidence for Phase 3

- [vercel/next.js#51593 — "Dot notation client component breaks consuming RSC"](https://github.com/vercel/next.js/issues/51593) — the canonical bug report; confirms Pattern C breakage
- [Dan Abramov's reply on #51593](https://github.com/vercel/next.js/issues/51593#issuecomment-1748001262) — "The idiomatic way would be to express this with multiple exports. And then use `import * as Navigation`. … That's better for tree shaking etc too."
- `@base-ui/react@1.3.0` on-disk source — `node_modules/.pnpm/@base-ui+react@1.3.0.../esm/combobox/index.js` contains `export * as Combobox from "./index.parts.js"`; every leaf in `index.parts.js` is a separate file with `'use client'`
- [shadcn/ui `dialog.tsx`](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/dialog.tsx) — canonical flat-export reference for Pattern B (rejected in favour of A)
- [Next.js `'use client'` directive docs](https://nextjs.org/docs/app/api-reference/directives/use-client)
- [Next.js `optimizePackageImports` docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports) — the workaround that subpath exports make unnecessary
- [vercel/next.js#60449 — barrel-file client-reference proxy boundary](https://github.com/vercel/next.js/issues/60449)

### Recent related work

- `baa67a3 feat(docs): collapsible code previews + on-this-page right rail (#39)`
- `5b7e71c feat(docs): wrap compound subcomponent props in Accordion (#38)` — shipped `PropsAccordion.tsx` as the RSC workaround that Phase 3 now removes
- `ba58fd6 refactor: migrate all compounds to Pattern A + fix docs props extraction (#36)` — current property-assignment Pattern A lands here; Phase 3 supersedes it
- `docs/plans/2026-04-14-feat-docs-and-compound-conventions-improvements-plan.md` — retrospective documents the RSC proxy wall and tracks the now-obsolete `/parts` subpath follow-up

## Phase overview

| Phase | Name                                                                                                        | Scope                                                                                                                                                                                                                                                                                                                                                                                       | Risk   | Effort   |
| ----- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| 1     | Zero-risk trim                                                                                              | Docs skeleton, dead type exports, empty CVA strings, trivial Highlight cleanup                                                                                                                                                                                                                                                                                                              | Low    | 30 min   |
| 2     | Next.js directives + icon imports                                                                           | Remove unnecessary `'use client'`, sweep Phosphor imports to `/ssr`                                                                                                                                                                                                                                                                                                                         | Low    | 45 min   |
| 3     | **Subcomponent export pattern migration + per-file split + subpath package exports + passthrough collapse** | Migrate all 11 compounds to `export * as Namespace` with per-file sub-component source layout (mirrors Base UI). Configure subpath package exports via `package.json` + `tsup` multi-entry. Codemod docs site to subpath imports. Rewrite `COMPOUND_PATTERNS.md`. Remove `PropsAccordion.tsx` workaround. Promote RSC canary to permanent debug route. Close the `/parts` subpath follow-up | High   | 2–3 days |
| 4     | Field `disabled` propagation                                                                                | Thread `disabled` from Field context into all four field-integrated controls                                                                                                                                                                                                                                                                                                                | Medium | 1.5 h    |
| 5     | HelperText / ErrorText consolidation                                                                        | Delete duplicated subcomponents on Select / RadioGroup / Fieldset; keep Field's only                                                                                                                                                                                                                                                                                                        | Medium | 1 h      |
| 6     | Prop-name inventory + Mark / LinkButton fixups                                                              | Research-first: cross-component prop-name table; then Mark inline-intent cleanup and LinkButton type reuse                                                                                                                                                                                                                                                                                  | Medium | 2 h      |
| 7     | Checked-state token                                                                                         | Extract `--intent-checked-bg` / `--intent-checked-border` tokens; migrate call sites                                                                                                                                                                                                                                                                                                        | Medium | 1 h      |
| 8     | Root prop types: `interface extends` → `type =`                                                             | Sweep 14 component root prop types to `type =` form per CLAUDE.md preference                                                                                                                                                                                                                                                                                                                | Low    | 45 min   |
| 9     | Test coverage backfill                                                                                      | Add tests for Indicator and LinkButton (currently untested)                                                                                                                                                                                                                                                                                                                                 | Low    | 1 h      |
| 10    | Minor polish                                                                                                | Accordion dead variants, Card `as` generic, Field hooks privacy, Button folder note, Accordion Context form, Indicator public surface, Marquee flag                                                                                                                                                                                                                                         | Low    | 1 h      |

**Suggested PR strategy:** Phases 1–2 as one PR (pure cleanup, no behaviour change). **Phase 3 as its own PR — the largest and most consequential change in the plan; 2–3 days of work, dedicated review.** Phase 4 as its own PR (the only behavioural change). Phase 5 as its own PR (public API removal). Phase 6 split into Research → Mark PR → LinkButton PR. Phase 7 as its own PR. Phases 8–10 bundled.

---

## Phase 1 — Zero-risk trim

Nothing here changes runtime behaviour. Everything is deletion of dead code or documentation correction.

### Files touched

- `docs/contributing/BASE_UI.md` — line ~349 (skeleton template)
- `packages/components/src/components/Select/index.tsx` — lines 62-65, 464
- `packages/components/src/components/Combobox/index.tsx` — lines 51-54
- `packages/components/src/components/Autocomplete/index.tsx` — lines 55-58
- `packages/components/src/index.tsx` — lines 100, 124, 149 (re-exports of deprecated aliases)
- `packages/components/src/components/Highlight/index.tsx` — lines 7-10 (`HighlightChunk` export), 59-62 (dead query-empty clause)
- `packages/components/src/components/Steps/index.tsx` — line 26 (`direction.horizontal: ''`)
- `packages/components/src/components/Carousel/index.tsx` — line 297 (`direction.vertical: ''`)

### Actions

1. **B3 — Replace Pattern B skeleton in `BASE_UI.md`.** The current block at lines ~349-351 shows `Object.assign(...)`. Since Phase 3 rewrites `COMPOUND_PATTERNS.md` entirely, Phase 1 can land the skeleton fix provisionally by deleting the `Object.assign` example and adding a `TODO: see Phase 3` marker that Phase 3 replaces with the final `export * as` example.

2. **Y2 — Delete three `@deprecated` type aliases.**
   - `SelectRootProps` (`Select/index.tsx:62-65`)
   - `ComboboxRootProps` (`Combobox/index.tsx:51-54`)
   - `AutocompleteRootProps` (`Autocomplete/index.tsx:55-58`)
   - Matching `export type { ... }` lines in `packages/components/src/index.tsx:100,124,149`
   - `SelectTriggerVariantProps` re-export at `Select/index.tsx:464` — misleading name, zero consumers

3. **M4 — Clean up `Highlight/index.tsx`.**
   - Lines 7-10: drop the `HighlightChunk` export.
   - Lines 59-62: drop the redundant `query === ''` clause; `!query` already catches empty string.

4. **M6 — Drop empty `''` CVA variant entries.**
   - `Steps/index.tsx:26` — `direction.horizontal: ''`
   - `Carousel/index.tsx:297` — `direction.vertical: ''`

### Acceptance

- [x] `BASE_UI.md` skeleton example no longer shows `Object.assign`
- [x] `rg "SelectRootProps|ComboboxRootProps|AutocompleteRootProps|SelectTriggerVariantProps"` returns 0 matches
- [x] `rg "HighlightChunk" packages/components/` returns 0 matches (only non-exported local type remains)
- [x] `pnpm --filter @oztix/roadie-components build && pnpm typecheck && pnpm test` passes
- [x] Docs site builds

---

## Phase 2 — Next.js directives + icon imports

Goal: ship the components package as server-first. Pure presentational wrappers are RSC-safe; wrappers that use hooks or Base UI primitives stay client. Phosphor imports use the `/ssr` path everywhere so a single import line works in both server and client components.

### Files touched

- `packages/components/src/components/Highlight/index.tsx` — remove `'use client'`
- `packages/components/src/components/Input/index.tsx` — remove `'use client'`
- `packages/components/src/components/Textarea/index.tsx` — remove `'use client'`
- `packages/components/src/components/Accordion/index.tsx` — Phosphor import
- `packages/components/src/components/Select/index.tsx` — Phosphor import
- `packages/components/src/components/Combobox/index.tsx` — Phosphor import
- `packages/components/src/components/Autocomplete/index.tsx` — Phosphor import
- `packages/components/src/components/Steps/index.tsx` — Phosphor import
- `docs/contributing/BASE_UI.md` — add server-safety rule

### Actions

1. **B1 — Remove unnecessary `'use client'` directives.** Highlight, Input, Textarea are leaf components with no hooks and no Base UI — safe to drop the directive. Before each deletion, `rg "useState|useEffect|useRef|useCallback|useMemo|useReducer|useContext|useId|useSyncExternalStore|createContext|forwardRef" <file>` must return zero matches.

2. **Add a Base UI guide note.** In `BASE_UI.md`:

   > **Server-safe by default.** Do not add `'use client'` unless the component calls a React hook, uses `createContext`, or wraps a Base UI primitive that needs a client boundary. Pure presentational wrappers must stay server-safe so Next.js consumers can render them in server components without forcing the entire tree into the client bundle.

3. **B2 — Sweep Phosphor imports to `/ssr`.** Replace every `from '@phosphor-icons/react'` with `from '@phosphor-icons/react/ssr'` in Accordion, Select, Combobox, Autocomplete, Steps. Carousel is already on `/ssr`.

4. **Add ESLint guard (optional, recommended).** `no-restricted-imports` rule scoped to `packages/components/src/**` and `docs/src/**` forbidding the non-SSR Phosphor path.

### Acceptance

- [x] `rg "'use client'" packages/components/src/components/Highlight/index.tsx packages/components/src/components/Input/index.tsx packages/components/src/components/Textarea/index.tsx` returns 0 matches
- [x] `rg "from '@phosphor-icons/react'" packages/components/src/` returns 0 matches
- [x] `pnpm build && pnpm test && pnpm typecheck` passes
- [x] Docs site builds
- [x] `BASE_UI.md` has the new server-safety paragraph
- [ ] ESLint `no-restricted-imports` rule (optional, deferred to follow-up)

---

## Phase 3 — Subcomponent export pattern migration + per-file split + subpath package exports + passthrough collapse

**The largest phase in the plan and the most consequential. Land as its own PR. Budget 2–3 days.**

**Three decisions committed in this phase:**

1. **Export pattern: Pattern A — `export * as Namespace`** — matches Base UI's published export shape. Resolves the RSC proxy breakage from next#51593.
2. **Source layout: per-file split** — one file per sub-component plus a `parts.ts` aggregator and a `index.ts` namespace re-export. Mirrors Base UI's on-disk source structure.
3. **Package shape: subpath exports** — `@oztix/roadie-components/combobox`, `/button`, `/field`, etc. are the canonical consumer imports. Barrel stays for compatibility.

### Background: the RSC proxy problem

Every current Roadie compound uses function-plus-property-assignment:

```tsx
export function Combobox(props) { ... }
export function ComboboxInput(props) { ... }
Combobox.Input = ComboboxInput
```

When a consumer imports `Combobox` into a Next.js **server component** and writes `<Combobox.Input />`, Next.js throws:

> "Cannot access .Foo on the server. You cannot dot into a client module from a server component. You can only pass the imported name through."

This is [vercel/next.js#51593](https://github.com/vercel/next.js/issues/51593). Next.js wraps every `'use client'` module behind a module-proxy that only resolves **top-level named exports** as client references. Property access on a function — `Combobox.Input` — is invisible across the boundary because the property assignment happens at runtime, after the proxy has already published its shape.

Dan Abramov's canonical reply on #51593:

> "I'd say we don't generally consider this very idiomatic: `Object.assign(Navigation, { Brand: NavigationBrand, ... })`. The idiomatic way would be to express this with multiple exports. And then use `import * as Navigation`. … That's better for tree shaking etc too."

PR #38 already hit this wall — the docs site ships `docs/src/components/PropsAccordion.tsx` as a client-component wrapper specifically so `<PropsDefinitions>` (a server component) can use `<Accordion.Item>` dot-access.

### Why `export * as Namespace` + per-file split

`export * as Combobox from './parts'` creates a real ESM namespace object. Each member is a top-level named export in the underlying `parts.ts` file, which in turn re-exports from individual sub-component files. The bundler emits a separate client reference per export, and `<Combobox.Input />` is property access on a plain namespace object, not on a client-reference proxy.

**Base UI 1.3.0 ships exactly this pattern, per-file.** Verified on-disk:

```
@base-ui/react/esm/combobox/
  index.js              # export * as Combobox from "./index.parts.js"
  index.parts.js        # export { ComboboxRoot as Root } from "./root/ComboboxRoot.js" ...
  root/ComboboxRoot.js  # 'use client' + export function ComboboxRoot
  input/ComboboxInput.js
  portal/ComboboxPortal.js
  ...                   # 25+ leaf files total
```

### Why subpath package exports

`import { Button } from '@oztix/roadie-components'` forces the Next.js bundler to walk the entire package barrel to reach Button, which means walking every `'use client'` module transitively reachable — Combobox, Select, Autocomplete, Carousel, Steps, etc. — even if they aren't used.

`import { Button } from '@oztix/roadie-components/button'` scopes the walk to a single subpath bundle. Next.js ships [`optimizePackageImports`](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports) specifically to work around barrel-file slowdowns; subpath exports make the optimization automatic and unconditional.

Base UI ships one subpath per component (`@base-ui-components/react/combobox`). Roadie adopting the same shape means consumers who use both libraries use a consistent import convention.

### Target file structure (per compound)

```
packages/components/src/components/Combobox/
  ComboboxRoot.tsx           # 'use client' + function ComboboxRoot + displayName
  ComboboxInput.tsx          # 'use client' + function ComboboxInput + displayName
  ComboboxInputGroup.tsx
  ComboboxTrigger.tsx
  ComboboxClear.tsx
  ComboboxPortal.tsx         # passthrough: export const ComboboxPortal = ComboboxPrimitive.Portal
  ComboboxPositioner.tsx
  ComboboxPopup.tsx
  ComboboxList.tsx           # passthrough
  ComboboxItem.tsx
  ComboboxItemIndicator.tsx
  ComboboxCollection.tsx     # passthrough
  ComboboxGroup.tsx
  ComboboxGroupLabel.tsx
  ComboboxEmpty.tsx
  ComboboxStatus.tsx
  ComboboxContext.ts         # shared React context (no 'use client' needed if type-only)
  variants.ts                # comboboxInputGroupVariants and shared types
  parts.ts                   # short-named aggregator
  index.ts                   # export * as Combobox from './parts' + flat variant/type re-exports
  Combobox.test.tsx          # namespace-level integration tests
```

### Target leaf file shape

```tsx
// ComboboxInput.tsx
'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui-components/react/combobox'
import type { VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { comboboxInputGroupVariants } from './variants'

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

// ComboboxInput.tsx

export type ComboboxInputProps = ComboboxPrimitive.Input.Props &
  VariantProps<typeof comboboxInputGroupVariants>

export function ComboboxInput({ className, ...props }: ComboboxInputProps) {
  return <ComboboxPrimitive.Input className={cn('...', className)} {...props} />
}
ComboboxInput.displayName = 'Combobox.Input'
```

Notes on the leaf file shape:

- **Function keeps its compound-prefixed name** (`ComboboxInput`) so stack traces and React DevTools are readable.
- **`displayName` is dot-notation** (`'Combobox.Input'`) — `<PropsDefinitions>` derives headings from this field.
- **Types export in the same file** as their function — consumers can reach them via the subpath import.
- **Shared context lives in `ComboboxContext.ts`** and is imported by leaf files that need it. Matches Base UI.

### Target passthrough file shape

```tsx
// ComboboxPortal.tsx
'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui-components/react/combobox'

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

// ComboboxPortal.tsx

export const ComboboxPortal = ComboboxPrimitive.Portal
export type ComboboxPortalProps = ComboboxPrimitive.Portal.Props
```

Pure passthrough — no wrapper function.

### Target aggregator (`parts.ts`)

```ts
// parts.ts
export { ComboboxRoot as Root } from './ComboboxRoot'
export type { ComboboxRootProps as RootProps } from './ComboboxRoot'

export { ComboboxInput as Input } from './ComboboxInput'
export type { ComboboxInputProps as InputProps } from './ComboboxInput'

export { ComboboxInputGroup as InputGroup } from './ComboboxInputGroup'
export type { ComboboxInputGroupProps as InputGroupProps } from './ComboboxInputGroup'

export { ComboboxTrigger as Trigger } from './ComboboxTrigger'
export type { ComboboxTriggerProps as TriggerProps } from './ComboboxTrigger'

export { ComboboxPortal as Portal } from './ComboboxPortal'
export type { ComboboxPortalProps as PortalProps } from './ComboboxPortal'

// ... every other sub-component
```

One line per sub-component. The only place short-name renames happen.

### Target namespace index (`index.ts`)

```ts
// index.ts
export * as Combobox from './parts'

// Variant maps and shared types live at the subpath root for consumers
// extending CVA. Co-located with their compound per TC2.
export { comboboxInputGroupVariants } from './variants'
export type { ComboboxInputGroupVariants } from './variants'
```

### Consumer surface (after migration)

```tsx
// Next.js app/page.tsx — a server component
import { Button } from '@oztix/roadie-components/button'
import { Combobox } from '@oztix/roadie-components/combobox'
import { Field } from '@oztix/roadie-components/field'

export default function Page() {
  return (
    <Field.Root>
      <Field.Label>Venue</Field.Label>
      <Combobox.Root>
        <Combobox.InputGroup>
          <Combobox.Input placeholder='Search...' />
          <Combobox.Trigger />
        </Combobox.InputGroup>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List>
                <Combobox.Item value='a'>A</Combobox.Item>
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      <Button>Submit</Button>
    </Field.Root>
  )
}
```

RSC-safe end to end. No client wrapper. No barrel walking.

### Actions

#### 1. Capture the pattern in a solutions entry

Create `docs/solutions/rsc-patterns/compound-export-namespace.md` with:

- Pattern C breakage with the #51593 quote and error message
- Why `export * as` works (ESM namespace semantics, top-level named exports, client-reference-per-member)
- Why per-file split (HMR isolation, bundler precision, Base UI parity)
- Why subpath exports (Next.js barrel cost, `optimizePackageImports` bypass, Base UI consumer parity)
- Base UI precedent (cite `@base-ui/react@1.3.0` on-disk source path)
- Roadie convention (folder structure, leaf shape, `parts.ts` aggregator, index namespace, subpath registration)
- Migration template for new components
- Test case showing `type X = Combobox.RootProps` working, and the `ComponentProps<typeof Combobox.Root>` fallback for edge cases

#### 2. Rewrite `docs/contributing/COMPOUND_PATTERNS.md`

Replace the existing "Pattern A (named export + property assignment)" mandate with the full new convention: `export * as Namespace` + per-file split + subpath exports. Preserve the context-wiring idioms and direct-children constraints.

Updates:

- **`displayName` requirement** — per-leaf-file with dot-notation string
- **Test file rule** — one `Compound.test.tsx` at the namespace level, not per sub-component. Per-file unit tests only where a sub-component has non-trivial internal logic.
- **Shared context rule** — if sub-components share context, factor it into `CompoundContext.ts` and import from each leaf. Matches Base UI.
- **Subpath registration rule** — every new compound adds an entry to `package.json` `exports` and `tsup` entry map (via generator).

Delete every reference to `Object.assign`, `Compound.Sub =`, and property assignment. Replace every code example.

Add a new "Type access" section documenting `Combobox.InputProps` namespace-type form and the `ComponentProps<typeof Combobox.Input>` fallback.

Add an "Authoring a new compound" checklist:

1. Create folder `packages/components/src/components/MyCompound/`
2. Create one `.tsx` per sub-component with `'use client'`, function definition, `displayName` set to dot-notation
3. Create `variants.ts` for CVA maps and shared types
4. Create `parts.ts` with short-name re-exports
5. Create `index.ts` with `export * as MyCompound from './parts'` plus flat variant re-exports
6. Create `MyCompound.test.tsx` at the namespace level
7. Run `pnpm generate:exports` to update `package.json` and `tsup.config.ts`
8. Add a `<MyCompound.Root>` line to the RSC canary page

#### 3. Configure `package.json` subpath exports

Update `packages/components/package.json`:

```json
{
  "name": "@oztix/roadie-components",
  "sideEffects": false,
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./button": { "import": "./dist/button.js", "types": "./dist/button.d.ts" },
    "./link-button": {
      "import": "./dist/link-button.js",
      "types": "./dist/link-button.d.ts"
    },
    "./accordion": {
      "import": "./dist/accordion.js",
      "types": "./dist/accordion.d.ts"
    },
    "./autocomplete": {
      "import": "./dist/autocomplete.js",
      "types": "./dist/autocomplete.d.ts"
    },
    "./badge": { "import": "./dist/badge.js", "types": "./dist/badge.d.ts" },
    "./breadcrumb": {
      "import": "./dist/breadcrumb.js",
      "types": "./dist/breadcrumb.d.ts"
    },
    "./card": { "import": "./dist/card.js", "types": "./dist/card.d.ts" },
    "./carousel": {
      "import": "./dist/carousel.js",
      "types": "./dist/carousel.d.ts"
    },
    "./code": { "import": "./dist/code.js", "types": "./dist/code.d.ts" },
    "./combobox": {
      "import": "./dist/combobox.js",
      "types": "./dist/combobox.d.ts"
    },
    "./field": { "import": "./dist/field.js", "types": "./dist/field.d.ts" },
    "./fieldset": {
      "import": "./dist/fieldset.js",
      "types": "./dist/fieldset.d.ts"
    },
    "./highlight": {
      "import": "./dist/highlight.js",
      "types": "./dist/highlight.d.ts"
    },
    "./input": { "import": "./dist/input.js", "types": "./dist/input.d.ts" },
    "./label": { "import": "./dist/label.js", "types": "./dist/label.d.ts" },
    "./mark": { "import": "./dist/mark.js", "types": "./dist/mark.d.ts" },
    "./marquee": {
      "import": "./dist/marquee.js",
      "types": "./dist/marquee.d.ts"
    },
    "./prose": { "import": "./dist/prose.js", "types": "./dist/prose.d.ts" },
    "./radio-group": {
      "import": "./dist/radio-group.js",
      "types": "./dist/radio-group.d.ts"
    },
    "./select": { "import": "./dist/select.js", "types": "./dist/select.d.ts" },
    "./separator": {
      "import": "./dist/separator.js",
      "types": "./dist/separator.d.ts"
    },
    "./steps": { "import": "./dist/steps.js", "types": "./dist/steps.d.ts" },
    "./textarea": {
      "import": "./dist/textarea.js",
      "types": "./dist/textarea.d.ts"
    }
  }
}
```

Notes:

- **`"sideEffects": false`** is required for tree-shaking to work predictably. Verified safe because CSS ships from `@oztix/roadie-core`.
- **`/button` exports both `Button` and `IconButton`** plus `buttonVariants`. They share a CVA variant map and co-locating matches the existing folder.
- **`/link-button` exports `LinkButton` and `LinkIconButton`** for the same reason.
- **`Indicator` is deliberately absent** — it's internal after Phase 10's M8.
- **`SpotIllustration` is absent** — covered by the separate plan carve-out.
- **Variant maps ship from their component's subpath** (TC2 decision). `buttonVariants` from `/button`, `cardVariants` from `/card`, etc.

Generate the `exports` map from a build script (`scripts/generate-package-exports.mjs`) that reads `packages/components/src/components/*/index.ts` and emits the map. Prevents drift when new components land.

#### 4. Configure `tsup` multi-entry build

Update `packages/components/tsup.config.ts`:

```ts
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'tsup'

function resolveEntries() {
  const componentsDir = resolve(__dirname, 'src/components')
  const entries: Record<string, string> = {
    index: 'src/index.tsx'
  }
  for (const name of readdirSync(componentsDir)) {
    // skip Indicator (internal after M8) and SpotIllustration (separate plan)
    if (name === 'Indicator' || name === 'SpotIllustration') continue
    const subpath = name.replace(
      /([A-Z])/g,
      (c, i) => (i ? '-' : '') + c.toLowerCase()
    )
    entries[subpath] = `src/components/${name}/index.ts`
  }
  return entries
}

export default defineConfig({
  entry: resolveEntries(),
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: true,
  treeshake: true
})
```

Notes:

- `splitting: true` lets tsup share common chunks across entries.
- The same generator script that builds `package.json` `exports` consumes this entry map so both stay in sync.

#### 5. Migrate each compound

Order (smallest first to de-risk):

1. **Fieldset** (3 subcomponents) — simplest, lowest blast radius; validates the tooling end-to-end
2. **Accordion** (3) — lets us delete `PropsAccordion.tsx` as a migration-green signal
3. **RadioGroup** (4)
4. **Breadcrumb** (5)
5. **Field** (5) — core, migrate carefully since everything else depends on it
6. **Card** (6)
7. **Carousel** (10) — most complex compound state machine; shared state via context module
8. **Steps** (14) — Ark UI wrapper, same pattern applies
9. **Autocomplete** (15)
10. **Combobox** (16)
11. **Select** (17) — largest, migrate last so the pattern is battle-tested

For each compound, per-file migration steps:

1. Create new files per the "Target file structure" template. Keep function names compound-prefixed and `displayName` dot-notation.
2. Extract CVA variant maps into `variants.ts`. Move shared context into `CompoundContext.ts` if any exists.
3. For pure passthroughs, create a tiny `ComboboxPortal.tsx` with `export const ComboboxPortal = ComboboxPrimitive.Portal` — no wrapper function.
4. Write `parts.ts` as the short-name aggregator.
5. Write `index.ts` with `export * as Compound from './parts'` plus flat variant re-exports.
6. Delete the old `Combobox/index.tsx` monolithic file.
7. Update `Combobox.test.tsx` — switch imports to the namespace form, update JSX tags where the root form changes.
8. Run `pnpm generate:exports` to update `package.json` + `tsup.config.ts`.
9. Verify the docs page for this compound still renders, and add a line to the RSC canary page referencing `<Compound.Root>`.

#### 6. Pure-passthrough list

While creating each compound's per-file structure, these sub-components are pure passthroughs — tiny files that do `export const X = Primitive.X`:

**Combobox:**

- `ComboboxPortal.tsx`, `ComboboxList.tsx`, `ComboboxCollection.tsx`

**Autocomplete:**

- `AutocompleteValue.tsx`, `AutocompletePortal.tsx`, `AutocompleteList.tsx`, `AutocompleteCollection.tsx`

**Select:**

- `SelectPortal.tsx`, `SelectItemText.tsx`

**Steps** (Ark UI, same principle):

- `StepsContent.tsx`, `StepsCompletedContent.tsx`, `StepsNextTrigger.tsx`, `StepsPrevTrigger.tsx`

The Ark UI `as React.ComponentType<...>` cast at old `Steps/index.tsx:226` disappears with the wrapper.

#### 7. Update the package barrel

`packages/components/src/index.tsx` keeps the barrel form for compat but re-exports from the same subpaths:

```tsx
export { Combobox } from './components/Combobox'
export type {
  ComboboxRootProps,
  ComboboxInputProps
} from './components/Combobox/ComboboxRoot'
export { comboboxInputGroupVariants } from './components/Combobox/variants'
// ... for every compound

export {
  Button,
  IconButton,
  buttonVariants,
  type ButtonProps,
  type IconButtonProps
} from './components/Button'
export {
  LinkButton,
  LinkIconButton,
  type LinkButtonProps,
  type LinkIconButtonProps
} from './components/LinkButton'
// ... for every leaf component
```

The barrel becomes a convenience re-export. `AGENTS.md` documents the subpath form as canonical.

#### 8. Codemod the docs site

Every `@oztix/roadie-components` import in `docs/src/` becomes a subpath import. Write a small jscodeshift transform that:

- **Rewrites barrel imports to subpath imports.** `import { Combobox, Button, Field } from '@oztix/roadie-components'` → three separate subpath imports.
- **Rewrites flat subcomponent imports.** `ComboboxInput`, `SelectTrigger`, etc. are no longer exported flat — rewrite as namespace access.
- **Rewrites root tag form.** Bare `<Combobox>` becomes `<Combobox.Root>`. `<Field>` becomes `<Field.Root>` across every doc example.
- **Handles MDX live examples** in `tsx-live` code fences so they resolve at runtime.

Grep coverage:

```bash
rg "^import .*\{[^}]*(Accordion|Autocomplete|Breadcrumb|Card|Carousel|Combobox|Field|Fieldset|RadioGroup|Select|Steps)[A-Z]\w+" docs/
rg "<(Combobox|Autocomplete|Accordion|Breadcrumb|Card|Carousel|Field|Fieldset|RadioGroup|Select|Steps)[^.A-Za-z]" docs/
rg "from '@oztix/roadie-components'" docs/src/
```

Use `jscodeshift` rather than sed — AST-aware, handles all the edge cases in one run.

#### 9. Delete `PropsAccordion.tsx` and close the `/parts` follow-up

- Delete `docs/src/components/PropsAccordion.tsx`. Under the new pattern, `<Accordion.Item>` works in a server component natively. Inline the usage in `<PropsDefinitions>`.
- Update `docs/plans/2026-04-14-feat-docs-and-compound-conventions-improvements-plan.md`'s Progress table: mark "Phase 2.5 — `/parts` subpath export (follow-up)" as superseded by this plan.

#### 10. Promote the RSC canary to a permanent debug route

Create `docs/src/app/debug/rsc-smoke/page.tsx` as a permanent server component route. No `'use client'`. Renders every compound's Root + at least one sub-component:

```tsx
// docs/src/app/debug/rsc-smoke/page.tsx
// No 'use client' — this is a server component.
import { Accordion } from '@oztix/roadie-components/accordion'
import { Combobox } from '@oztix/roadie-components/combobox'
import { Field } from '@oztix/roadie-components/field'
import { Select } from '@oztix/roadie-components/select'

// ... every compound

export default function RscSmokePage() {
  return (
    <main>
      <h1>RSC smoke test</h1>
      <p>
        Every compound renders from a server component without a client wrapper.
      </p>

      <section>
        <h2>Combobox</h2>
        <Combobox.Root>
          <Combobox.InputGroup>
            <Combobox.Input placeholder='Test' />
          </Combobox.InputGroup>
        </Combobox.Root>
      </section>

      <section>
        <h2>Select</h2>
        <Select.Root>...</Select.Root>
      </section>

      {/* ... every compound */}
    </main>
  )
}
```

CI builds the docs site, so the canary fails the build if any compound regresses from RSC-safe. Every new compound authoring includes "add a line to the RSC canary" as a step in `COMPOUND_PATTERNS.md`.

### Pilot status (Fieldset — 2026-04-15)

Phase 3 opened with a Fieldset pilot to validate the pattern end-to-end before migrating the remaining 10 compounds. **The pilot landed a zero-breaking-change pattern** — consumers that used bare `<Fieldset>` before Phase 3 continue to work unchanged, and `<Fieldset.Root>` is also supported as an alias. The pattern works via **per-file leaves on disk + server-safe property assignment in `index.tsx` + tsdown `unbundle: true`**.

**Final pattern:**

1. **Per-file leaves on disk.** Every sub-component is its own source file in the compound folder. Tsdown builds with `unbundle: true`, emitting each source file as its own dist file (`dist/components/Fieldset/FieldsetRoot.js`, `FieldsetLegend.js`, etc.), preserving the source directory structure 1:1. Rolldown preserves `'use client'` on per-file outputs natively.
2. **Server-safe property assignment in `index.tsx`.** The compound's `index.tsx` is a server-safe module (**no `'use client'`**). It imports each leaf by name, casts `FieldsetRoot` to a type-widened alias including sub-component properties, and attaches each leaf via property assignment (`Fieldset.Legend = FieldsetLegend`, etc.). This is the same shape as the pre-Phase-3 broken pattern — but it works now because `index.tsx` is server-safe, so Next.js doesn't wrap it in a client-reference proxy. The property assignments happen in ordinary server-side JavaScript at module load time.
3. **`'use client'` only where needed.** Leaves with hooks, `createContext`, or client primitives carry the directive. Pure presentational leaves (`FieldsetLegend`, `FieldsetHelperText`) ship as server-safe components. The `index.tsx` property-assignment layer is server-safe.
4. **Both subpath and barrel work in server components.** `import { Fieldset } from '@oztix/roadie-components/fieldset'` and `import { Fieldset } from '@oztix/roadie-components'` both resolve to the same augmented root function. Subpath form is preferred (scopes the Next.js compiler walk to one compound), but both are valid. The RSC canary at `/debug/rsc-smoke` tests three forms — bare `<Fieldset>`, explicit `<Fieldset.Root>`, and barrel-imported bare root — on every docs build.
5. **Zero breaking change.** `<Fieldset>` (bare root) is the canonical form and is identical to `<Fieldset.Root>` (same function reference — literally `Fieldset === Fieldset.Root`). Existing consumer code using bare `<Fieldset>` continues to work unchanged. Docs pages that already used `<Fieldset>` (e.g. `components/forms/page.mdx`) need no migration. The original plan's "strict migration from `<Field>` to `<Field.Root>`" is cancelled — bare root stays.

[`docs/solutions/rsc-patterns/compound-export-namespace.md`](../solutions/rsc-patterns/compound-export-namespace.md) and [`docs/contributing/COMPOUND_PATTERNS.md`](../contributing/COMPOUND_PATTERNS.md) document the final pattern in full.

**The four shapes ruled out along the way:**

1. **Pre-Phase-3: property assignment with `'use client'` on `index.tsx`** — broken at [vercel/next.js#51593](https://github.com/vercel/next.js/issues/51593). The directive made the whole module a client module wrapped in a client-reference proxy; runtime property assignments were invisible on the server side.
2. **`export * as Namespace` with bundled tsdown output** — matches Base UI's published shape, but tsdown was bundling each compound folder into a single file. The namespace collapsed to a single client-reference proxy and `<Fieldset.Root />` failed with "Element type is invalid" — same failure mode as property assignment.
3. **Flat library exports + consumer-side `import * as`** — worked, but required a non-standard consumer import form (`import * as Fieldset`) diverging from Base UI and every other React library. Also forced `<Fieldset>` → `<Fieldset.Root>` as a breaking change.
4. **`export * as Namespace` on server-safe `index.tsx` + `unbundle: true`** — worked for `<Fieldset.Root>` but not for bare `<Fieldset>`, because the library was shipping a namespace object instead of a callable root. Required the `<Fieldset>` → `<Fieldset.Root>` breaking change.

**What finally unlocked the zero-breaking-change pattern:** realising that under `unbundle: true`, the original pre-Phase-3 property-assignment pattern actually works — the reason it was broken before was that `index.tsx` carried `'use client'` and got wrapped in a client-reference proxy. Remove the directive from `index.tsx` (and put it on the leaf files that actually need it), and the property assignments execute in server-safe JavaScript at module load time. The classic `Compound.Sub = SubFn` pattern is rehabilitated.

**Note on bundler:** Roadie uses **tsdown** (rolldown-backed), not tsup. Every reference to `tsup.config.ts` in the Acceptance list below should be read as "no config change required — tsdown's unbundle mode + the generator script handle this already."

### Acceptance (Pilot — Fieldset only)

- [x] `docs/solutions/rsc-patterns/compound-export-namespace.md` exists, documents the final per-file + server-safe property-assignment + tsdown unbundle pattern, cites #51593 and Base UI 1.3.0 on-disk source, linked from `COMPOUND_PATTERNS.md`
- [x] `docs/contributing/COMPOUND_PATTERNS.md` rewritten — documents the final pattern, the `'use client'`-only-where-needed rule, and bare `<Compound>` as the canonical root form
- [x] Authoring checklist in `COMPOUND_PATTERNS.md` covers: folder structure, leaf file shape, `variants.ts`, shared context, `index.tsx` property-assignment layer, test file placement, `package.json` + tsdown generation, RSC canary page update
- [x] `packages/components/tsdown.config.ts` uses `unbundle: true` + a `src/**/*.{ts,tsx}` glob entry; dist output is `dist/components/<Compound>/*` one-file-per-source
- [x] Pilot compound (Fieldset) migrated to per-file layout with server-safe `index.tsx` property-assignment layer and `'use client'` only on files that actually need it
- [x] Fieldset folder contains: per-file sub-components (`FieldsetRoot`, `FieldsetLegend`, `FieldsetHelperText`, `FieldsetErrorText`), `FieldsetContext.ts`, `index.tsx`, `Fieldset.test.tsx`. No `parts.ts` — `index.tsx` imports leaves directly.
- [x] Every Fieldset leaf file sets `displayName` to the dot-notation form (`'Fieldset.Root'`, `'Fieldset.Legend'`, etc.)
- [x] `packages/components/package.json` has `"sideEffects": false` (pre-existing) and an `exports` map with one entry per compound (generated, points at `dist/components/<Compound>/index.js`)
- [x] `scripts/generate-package-exports.mjs` exists and regenerates `package.json` `exports` from folder contents, targeting the unbundle-mode dist layout. Wired into `pnpm build`.
- [x] Package barrel (`src/index.tsx`) re-exports `Fieldset` as `export { Fieldset } from './components/Fieldset'` — works in both server and client components
- [x] Fieldset docs page `docs/src/app/components/fieldset/page.mdx` uses bare `<Fieldset>` in code examples (canonical root form)
- [x] `<PropsDefinitions>` accepts folder paths and enumerates every non-test `.tsx` file for parsing (enables per-file compounds)
- [x] `docs/src/app/debug/rsc-smoke/page.tsx` exists as a permanent server-component route rendering Fieldset in three forms: bare `<Fieldset>` via subpath, `<Fieldset.Root>` alias via subpath, and bare `<Fieldset>` via barrel. Follow-up compounds add their own sections.
- [x] Fieldset test exercises both `<Fieldset>` (canonical) and `<Fieldset.Root>` (alias) forms, and asserts `Fieldset === Fieldset.Root`
- [x] **Zero breaking change confirmed.** Consumers using bare `<Fieldset>` before Phase 3 keep working unchanged. `docs/src/app/components/forms/page.mdx` already uses bare `<Fieldset>` — no migration required.
- [x] `pnpm --filter @oztix/roadie-components build && test && typecheck && lint` passes
- [x] `pnpm --filter docs build` passes, including the RSC canary page rendering without "Element type is invalid"

### Acceptance (Remaining — post-pilot)

- [x] Remaining 10 compounds migrated to the corrected per-file pattern (Accordion → RadioGroup → Breadcrumb → Card → Steps → Field → Select → Autocomplete → Combobox → Carousel)
- [x] No compound file outside leaf modules carries `'use client'`. Grep confirms no `index.tsx` in a compound folder has the directive:
  ```bash
  rg "^'use client'" packages/components/src/components/*/index.tsx
  ```
- [x] Every compound folder contains: per-file sub-components, `variants.ts` (if applicable), `<Compound>Context.ts` (if shared context), `index.tsx` with server-safe property-assignment layer, one `*.test.tsx` exercising both bare and `.Root` forms.
- [x] Every leaf file sets `displayName` to the dot-notation form
- [x] Every compound's `index.tsx` attaches sub-components to the root function via type-cast + property assignment, and exports `<Compound>Props` (aliased from `<Compound>RootProps`)
- [x] Docs site imports updated — compound doc pages use subpath form (`@oztix/roadie-components/<compound>`) and `<Compound>` bare root in code examples
- [x] `<PropsDefinitions>` on every compound doc page renders correct subcomponent headings (dot-notation form) by passing the folder path
- [x] After Accordion migrates: `docs/src/components/PropsAccordion.tsx` deleted; `<PropsDefinitions>` uses `<Accordion.Item>` directly
- [x] `docs/plans/2026-04-14-feat-docs-and-compound-conventions-improvements-plan.md` Progress table updated to mark `/parts` follow-up as superseded
- [x] RSC canary page renders every migrated compound via the subpath import; docs build fails if any regresses
- [x] `pnpm build && pnpm test && pnpm typecheck && pnpm lint` passes
- [x] Docs site builds without the "Element type is invalid" error

### Risks

- **Largest diff in the plan.** 11 compounds × ~10 avg sub-components = ~110 new per-component leaf files, plus `parts.ts`, `variants.ts`, `index.ts` per compound. Plus every test file adjustment, every docs page codemod, `package.json` + `tsup` + generator script. 2–3 days. Its own PR.
- **File count increases significantly.** ~110 new files in the components folder. Editors and `ls` handle this fine, but PR diffs are larger than usual. Mitigation: land one compound at a time via commits within the PR.
- **~~Breaking change for the docs consumer.~~** ~~Every `import { X } from '@oztix/roadie-components'` becomes a subpath import. Every bare `<Compound>` root becomes `<Compound.Root>`. The codemod handles the mechanics; budget 1-2 hours of docs-site review.~~ **Cancelled by the pilot.** The property-assignment pattern preserves bare `<Compound>` as the canonical form — `Fieldset === Fieldset.Root` — so existing consumer code using bare `<Fieldset>` keeps working unchanged. Subpath imports remain preferred but the barrel also works from server components.
- **~~Field ergonomics — `<Field>` → `<Field.Root>`.~~** ~~Strict migration. Consistency win outweighs the diff cost and matches Base UI.~~ **Cancelled by the pilot.** Both forms work; bare `<Field>` stays canonical.
- **`react-docgen-typescript` headings depend on `displayName`** — easy to miss one across 110 files. Mitigation: per-file split makes it harder to forget (each file has its own displayName line), and the RSC canary page visually surfaces any broken sub-components.
- **Variant map location** — `buttonVariants` ships from `@oztix/roadie-components/button` alongside `Button` and `IconButton` (TC2 decision). Consumers extending CVA get it from the same subpath. Per-compound `variants.ts` files keep the map co-located.
- **Generator script as source-of-truth.** `scripts/generate-package-exports.mjs` owns the subpath list. Hand-editing `package.json` `exports` is forbidden (document in `COMPOUND_PATTERNS.md`). Prevents drift.
- **Barrel as compat only.** The barrel re-exports remain for any consumer too invested to switch. `AGENTS.md` documents the subpath form as canonical. No plans to remove the barrel — it's zero cost to keep.
- **Base UI releases a breaking namespace change.** Unlikely. The migration touches each compound's leaf files, so a Base UI update surface is the same place.
- **Type namespace collision.** If any compound defined a TypeScript namespace explicitly (`export namespace Combobox { ... }`), it collides with `export * as Combobox`. None do today. Document as a guardrail.
- **HMR / Fast Refresh.** Per-file split is the happiest path for HMR. Base UI uses it in Next.js apps at scale. Smoke test during development.
- **`sideEffects: false` risk.** Verified safe because CSS ships from `@oztix/roadie-core`. If Phase 3 ever adds a side-effecting import, flip to whitelist form: `"sideEffects": ["**/*.css"]`.

### Why Pattern A over Pattern B (Shadcn flat exports)

For the record, in case the decision is revisited:

| Dimension                 | Pattern A (`export * as`)                                   | Pattern B (flat exports)                    | Current (property assignment)       |
| ------------------------- | ----------------------------------------------------------- | ------------------------------------------- | ----------------------------------- |
| RSC safe                  | ✅ Yes — Base UI 1.3.0 in production                        | ✅ Yes — shadcn at scale                    | ❌ **Broken** per next#51593        |
| Import surface            | 1 per compound                                              | N per compound (5-17 for Roadie)            | 1 per compound                      |
| Tree-shaking              | Per-member (per-file split + `sideEffects: false`)          | Per-member                                  | Partial                             |
| `react-docgen-typescript` | Per-leaf `displayName` picked up natively                   | Picked up natively                          | Works with manual displayName       |
| HMR / Fast Refresh        | Works (per-file split isolates invalidation)                | Works                                       | Fragile under monolithic parts file |
| Matches Base UI           | ✅ 1:1 (namespace shape + on-disk layout + subpath exports) | ❌ Different vocabulary                     | ❌ Different vocabulary             |
| Subpath export fit        | Natural — each subpath's namespace is one file              | Natural — each subpath exports N flat names | Natural                             |
| Consumer cognitive load   | Low — `<Combobox.Input>` mirrors Base UI                    | Medium — second vocabulary                  | Low — but broken in RSC             |
| Industry precedent 2026   | Base UI, Radix, Ark UI                                      | shadcn/ui, most Tailwind kits               | Pre-RSC React                       |

Both Pattern A and Pattern B work in RSC. The tiebreaker is Base UI parity at every level: namespace export shape, per-file source layout, and subpath package exports. Consumers who use Base UI directly for anything Roadie doesn't wrap get a consistent import convention across the whole stack.

---

## Phase 4 — Field `disabled` propagation

The only behaviour change in this plan. Select, RadioGroup, Combobox, and Autocomplete read `invalid` and `required` from Field context today but drop `disabled` on the floor.

**Dependency on Phase 3:** after migration, the file paths and function names change (per-file split). Phase 4 is expressed below in terms of the post-Phase-3 layout.

### Files touched

- `packages/components/src/components/Field/FieldContext.ts` — confirm `disabled` is in context
- `packages/components/src/components/Select/SelectRoot.tsx` — thread `disabled`
- `packages/components/src/components/RadioGroup/RadioGroupRoot.tsx`
- `packages/components/src/components/Combobox/ComboboxRoot.tsx`
- `packages/components/src/components/Autocomplete/AutocompleteRoot.tsx`
- `packages/components/src/components/Field/Field.test.tsx` — new test cases

### Actions

1. **Audit current state.** For each control, find every `useFieldContext()` destructure and confirm `disabled` is missing. Thread it into the Base UI Root:

   ```tsx
   const fieldContext = useFieldContext()
   return <SelectPrimitive.Root disabled={disabled ?? fieldContext.disabled} {...props} />
   ```

2. **Precedence rule.** `disabled: ownDisabled ?? fieldContext.disabled`. Consumer-level wins over context-level.

3. **Visual state parity.** Confirm `is-interactive-field` in `packages/core/src/css/interactions.css` responds to `[data-disabled]` / `[aria-disabled=true]`. If not, add the selector.

4. **Test coverage.** In `Field/Field.test.tsx`, add 4 new tests — one per control.

### Acceptance

- [ ] Each of Select, RadioGroup, Combobox, Autocomplete reads `disabled` from Field context at the Root
- [ ] Consumer-supplied `disabled` still wins over Field context
- [ ] 4 new Field tests assert `disabled` propagation
- [ ] `<Field.Root disabled>` visually disables each control in the docs site
- [ ] `is-interactive-field` responds to `[data-disabled]` on all four controls

### Risks

- Base UI primitives may not accept `disabled` at Root for every compound — fall back to threading through InputGroup/Input for that specific control.
- Existing consumers passing `disabled` on each control still work (consumer wins).

---

## Phase 5 — HelperText / ErrorText consolidation

Delete `Fieldset.HelperText`, `Fieldset.ErrorText`, `RadioGroup.HelperText`, `RadioGroup.ErrorText`, `Select.HelperText`, `Select.ErrorText`. Keep only `Field.HelperText` and `Field.ErrorText`.

**Dependency on Phase 3:** the subcomponents now live in per-file leaves.

### Files touched

- `packages/components/src/components/Fieldset/FieldsetHelperText.tsx` — delete
- `packages/components/src/components/Fieldset/FieldsetErrorText.tsx` — delete
- `packages/components/src/components/RadioGroup/RadioGroupHelperText.tsx` — delete
- `packages/components/src/components/RadioGroup/RadioGroupErrorText.tsx` — delete
- `packages/components/src/components/Select/SelectHelperText.tsx` — delete
- `packages/components/src/components/Select/SelectErrorText.tsx` — delete
- Each compound's `parts.ts` — remove the short-name re-exports
- `packages/components/src/index.tsx` — remove re-exports
- `docs/src/app/components/fieldset/page.mdx`, `radio-group/page.mdx`, `select/page.mdx`

### Actions

1. **Consumer audit first.**

   ```bash
   rg "Fieldset\.(HelperText|ErrorText)|RadioGroup\.(HelperText|ErrorText)|Select\.(HelperText|ErrorText)" packages/ docs/
   ```

   Rewrite any docs examples to wrap in `<Field.Root>` + `Field.HelperText` / `Field.ErrorText`.

2. **Delete the duplicated leaf files.** Remove `parts.ts` short-name re-exports. Remove any internal context fields only used by these subcomponents.

3. **Barrel cleanup.** Remove matching exports from the package barrel.

4. **Docs note.** `AGENTS.md` form-rules section: "Helper and error text live on `Field`, not on individual controls."

### Acceptance

- [ ] `rg "Fieldset\.HelperText|Fieldset\.ErrorText|RadioGroup\.HelperText|RadioGroup\.ErrorText|Select\.HelperText|Select\.ErrorText" packages/ docs/` returns 0 matches
- [ ] `pnpm build && pnpm test` passes
- [ ] Every component doc page still renders helper/error text examples via Field
- [ ] ~120 LOC removed
- [ ] `AGENTS.md` form-rules section explicitly states helper/error text lives on Field only

---

## Phase 6 — Prop-name inventory + Mark / LinkButton fixups

### Y6a — Research: cross-component prop-name inventory

Re-run the prop-inventory agent. Deliverable: `docs/solutions/conventions/prop-name-inventory-2026-04-15.md` with a full comparison table and divergences section. **Deliverable gate:** do not proceed to Y6b / Y6c fixes until the inventory is written and reviewed.

### Y6b — Mark inline-intent cleanup

1. Replace Mark's local intent map with `intentVariants` from `../../variants.ts`.
2. Remove `'neutral-inverted'` from the intent union.
3. Add a separate `inverted?: boolean` prop on `MarkProps`.
4. Update Mark's docs page.

### Y6c — LinkButton variant reuse

1. Delete the four exported type aliases (`LinkButtonIntent`, `LinkButtonEmphasis`, `LinkButtonSize`, `LinkIconButtonSize`).
2. Inline the literal union on each prop directly (matches Button post-PR #36).
3. Consider re-exporting `ButtonIntent = VariantProps<typeof buttonVariants>['intent']` from `Button/variants.ts` for rare consumers.

### Acceptance

- [ ] `docs/solutions/conventions/prop-name-inventory-2026-04-15.md` exists
- [ ] `rg "'neutral-inverted'" packages/components/src/` returns 0 matches
- [ ] `Mark` exposes an `inverted?: boolean` prop
- [ ] `rg "LinkButtonIntent|LinkButtonEmphasis|LinkButtonSize|LinkIconButtonSize" packages/ docs/` returns 0 matches

---

## Phase 7 — Checked-state token

Four files reach directly for `var(--color-accent-*)` because the intent/emphasis system doesn't expose a "checked state" token.

### Files touched

- `packages/core/src/css/tokens.css`
- `packages/core/src/css/intents.css`
- `packages/components/src/components/Select/SelectTrigger.tsx`
- `packages/components/src/components/RadioGroup/RadioGroupItem.tsx`
- `packages/components/src/components/Steps/StepsItem.tsx`
- `docs/src/app/foundations/colors/page.tsx`

### Actions

1. **Define tokens** in `intents.css`:

   ```css
   --intent-checked-bg: var(--intent-2);
   --intent-checked-bg-strong: var(--intent-3);
   --intent-checked-border: var(--intent-9);
   --intent-checked-marker: var(--intent-9);
   ```

2. **Register Tailwind utilities** in `tokens.css`:

   ```css
   @theme inline {
     --background-color-checked: var(--intent-checked-bg);
     --background-color-checked-strong: var(--intent-checked-bg-strong);
     --border-color-checked: var(--intent-checked-border);
   }
   ```

3. **Migrate call sites** to `bg-checked`, `bg-checked-strong`, `border-checked`.

4. **Document** in `foundations/colors/page.tsx`.

5. **Visual regression check.**

### Acceptance

- [ ] `rg "var\(--color-accent-\d" packages/components/src/components/` returns 0 matches
- [ ] New tokens visible in `foundations/colors` docs
- [ ] Select / RadioGroup / Steps render identically to `main` in light and dark modes
- [ ] Checkbox and Switch authors can use `bg-checked` / `border-checked` on day one

---

## Phase 8 — Root prop types: `interface extends` → `type =`

Sweep 14 root prop types to `type =` form per CLAUDE.md preference. SpotIllustration excluded.

### Actions

1. Convert each of: `AccordionProps`, `FieldProps`, `FieldsetProps`, `BadgeProps`, `SeparatorProps`, `InputProps`, `TextareaProps`, `CodeProps`, `MarqueeProps`, `LabelProps`, `RequiredIndicatorProps`, `OptionalIndicatorProps`, `HighlightProps`, `CarouselProps`.

   ```tsx
   // before
   export interface BadgeProps extends ComponentProps<'span'>, VariantProps<typeof badgeVariants> { ... }
   // after
   export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { ... }
   ```

2. Accordion — unify root and item to both use `type =`.

### Acceptance

- [ ] `rg "^export interface \w+Props" packages/components/src/` returns 0 matches except SpotIllustration
- [ ] `pnpm typecheck` passes
- [ ] All docs pages render with identical prop tables

---

## Phase 9 — Test coverage backfill

Two components have no tests: `Indicator` and `LinkButton`.

### Files to create

- `packages/components/src/components/Indicator/Indicator.test.tsx`
- `packages/components/src/components/LinkButton/LinkButton.test.tsx`

### Actions

- Indicator tests: assert CVA class names, className passthrough.
- LinkButton tests: assert root element is `<a>`, CVA variants apply expected classes, `href`/`target`/`rel` passthrough. Mirror `Button.test.tsx`.

### Acceptance

- [ ] New test files exist and pass
- [ ] Every component folder has a test file

---

## Phase 10 — Minor polish

Grouped into one PR. Post-Phase-3 file paths apply.

### Actions

1. **M1 — Accordion dead variant entries.** Remove `subtler: ''`, `normal: ''`. Inline the `accordionItemVariants` Record into the CVA.

2. **M2 — Accordion Context provider form.** `<AccordionContext.Provider value={...}>` → `<AccordionContext value={...}>` (React 19 bare form).

3. **M3 — Card `as` generic removal.** Drop the `T extends ElementType` generic, the `CardOwnProps` helper, and the runtime `as` check. Verify `rg "<Card as=" packages/ docs/` is 0.

4. **M5 — `useFieldInputProps` / `useFieldContext` privacy.** Drop `export`. Remove barrel re-exports.

5. **M7 — Button folder layout.** Button stays flat (not a namespace) because Button and IconButton are two peer root components, not a compound. They share `buttonVariants` and co-locate in `packages/components/src/components/Button/`. Both ship from the single subpath `@oztix/roadie-components/button`, which also re-exports `buttonVariants` (per TC2). Add a comment at the top of `Button/index.ts` explaining the multi-file layout and the Pattern-A exception: _"Button is a leaf component family, not a compound. Two peer components (Button, IconButton) share `buttonVariants` and ship together from the `/button` subpath. Pattern A namespace export does not apply."_

6. **M8 — Indicator public surface.** Drop the package-root exports for `RequiredIndicator` / `OptionalIndicator`. They remain internal to Field / Select / RadioGroup. Remove the `/indicator` subpath from `package.json` `exports` (the generator already skips it). Gate on Phase 9 tests being green.

### Acceptance

- [ ] Accordion CVA has no empty-string variant entries
- [ ] `rg "AccordionContext\.Provider" packages/` returns 0 matches
- [ ] `rg "as Record<string, unknown>" packages/components/src/components/Card/` returns 0 matches
- [ ] `rg "<Card as=" packages/ docs/` returns 0 matches
- [ ] `useFieldInputProps` / `useFieldContext` removed from `packages/components/src/index.tsx`
- [ ] Button folder has a comment documenting the multi-file layout and flat-export exception
- [ ] `RequiredIndicator` / `OptionalIndicator` removed from package barrel and not present in `package.json` exports
- [ ] All tests pass and docs site builds

---

## Cross-phase acceptance

Beyond per-phase checks, verify at the end of the sweep:

- [ ] `pnpm build && pnpm test && pnpm typecheck && pnpm lint` all pass
- [ ] `find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete && pnpm typecheck` — clean CI view also passes
- [ ] Docs site builds and a manual smoke test covers every component page
- [ ] **Permanent RSC canary** at `docs/src/app/debug/rsc-smoke/page.tsx` builds as a server component and renders every compound's Root + at least one sub-component, without the "Element type is invalid" error. Linked from `COMPOUND_PATTERNS.md` as the failure surface for future compound regressions
- [ ] `docs/solutions/rsc-patterns/compound-export-namespace.md` exists and is linked from `COMPOUND_PATTERNS.md`
- [ ] `docs/solutions/conventions/prop-name-inventory-2026-04-15.md` exists and is linked from `docs/contributing/COMPONENT_DOC_TEMPLATE.md`
- [ ] `docs/contributing/COMPOUND_PATTERNS.md` has zero references to `Object.assign` or property-assignment form; has an explicit "creating a new compound" checklist
- [x] `docs/plans/2026-04-14-feat-docs-and-compound-conventions-improvements-plan.md` Progress table marks Phase 2.5 (`/parts` subpath) as superseded
- [x] `docs/src/components/PropsAccordion.tsx` is deleted
- [ ] `packages/components/package.json` has `"sideEffects": false` and an auto-generated `exports` map
- [ ] `packages/components/tsup.config.ts` builds one output per subpath
- [ ] `scripts/generate-package-exports.mjs` exists and the build pipeline runs it before `tsup`
- [ ] `rg "from '@oztix/roadie-components'" docs/src/` returns 0 matches (all uses are subpath form)
- [ ] `AGENTS.md` documents subpath imports as canonical with an example block
- [ ] A one-page "what changed and why" note in `docs/solutions/` captures the server-component shift, subpath export shape, `disabled` propagation pattern, and checked-state token

## Success metrics

- **RSC-safe by construction.** Every compound subcomponent works in a Next.js server component without a client-wrapper workaround. Permanent canary page catches regressions in CI.
- **Source-shape parity with Base UI.** Roadie's compound structure mirrors upstream 1:1 — same `export * as Namespace`, same per-file source layout, same subpath package exports.
- **Next.js build performance.** Consumers importing from subpaths bypass barrel-file walks entirely. No reliance on `optimizePackageImports`.
- **Tree-shaking predictability.** `"sideEffects": false` + per-file split + subpath exports means bundlers drop unused sub-components mechanically, not through heuristic analysis.
- **LOC reduction:** ~350 LOC net removed; ~98 property-assignment lines replaced with ~98 per-leaf displayName lines. File count rises by ~110 but average file size drops below 50 lines.
- **Public API surface:** ~25 fewer exports from the package barrel; ~26 subpath entry points added.
- **Server-safe components:** Highlight, Input, Textarea usable in Next.js RSC trees without forcing a client boundary.
- **Decision points removed:** one canonical subcomponent export pattern, one canonical place for helper/error text, one canonical pattern for `disabled` inheritance, one canonical token for checked state, one canonical import path for Phosphor icons, one canonical import shape for the package.
- **Zero-drift patterns:** LinkButton variants can no longer drift from Button; Mark no longer duplicates `intentVariants`; `package.json` `exports` and `tsup` entries generated from source of truth.

## Out-of-scope follow-ups

- **Steps → Base UI migration.** Standalone plan. Ark stays for now.
- **SpotIllustration barrel export / packaging.** Standalone plan.
- **Marquee complexity audit.** Worth its own pass.
- **ESLint rules:** forbid non-SSR Phosphor path; forbid `Object.assign` + property-assignment compound patterns; forbid barrel imports from `@oztix/roadie-components` in favour of subpaths. Make any required if drift appears post-merge.
- **Base UI primitive re-exports.** Worth considering whether Roadie should re-export Base UI primitives that have no Roadie styling layer (e.g., `Tooltip.Provider`) directly. Revisit after the 5 new components land.
- **Migration guide for external consumers.** Not needed today (no external consumers). When Roadie ships externally, Phase 3 is a breaking change and will need a migration note in the release.

## Sources & references

### Origin

- Code review run on 2026-04-15 via `/compound-engineering:ce:review` — findings B1–B6, Y1–Y7, M1–M8
- Plan deepened on 2026-04-15 via `/compound-engineering:deepen-plan` — Phase 3 rewritten with research evidence
- Plan technically reviewed on 2026-04-15 — Phase 3 extended with per-file split, subpath exports, permanent RSC canary, and generator script

### Canonical in-repo references

- `AGENTS.md` — styling and component rules (updated in Phase 3 to document subpath imports as canonical)
- `docs/contributing/BASE_UI.md` — Base UI wrapping contract (Pattern B bug fixed in Phase 1)
- `docs/contributing/COMPOUND_PATTERNS.md` — rewritten in Phase 3 for `export * as` + per-file split + subpath exports
- `docs/contributing/COMPONENT_DOC_TEMPLATE.md` — docs structure
- `docs/solutions/build-errors/react-docgen-cva-literal-props.md`
- `docs/solutions/build-errors/cross-bundler-dev-env-check.md`
- `docs/solutions/build-errors/stale-tsbuildinfo-masks-local-errors.md`

### External evidence (Phase 3 research)

- [vercel/next.js#51593 — "Dot notation client component breaks consuming RSC"](https://github.com/vercel/next.js/issues/51593)
- [Dan Abramov's reply recommending `export * as` + `import * as`](https://github.com/vercel/next.js/issues/51593#issuecomment-1748001262)
- `@base-ui/react@1.3.0` on-disk source — `node_modules/.pnpm/@base-ui+react@1.3.0.../esm/combobox/index.js`
- [shadcn/ui `dialog.tsx`](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/dialog.tsx)
- [Next.js `'use client'` directive docs](https://nextjs.org/docs/app/api-reference/directives/use-client)
- [Next.js `optimizePackageImports` docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports)
- [vercel/next.js#60449 — barrel-file client-reference proxy boundary](https://github.com/vercel/next.js/issues/60449)

### Recent related work

- `baa67a3 feat(docs): collapsible code previews + on-this-page right rail (#39)`
- `5b7e71c feat(docs): wrap compound subcomponent props in Accordion (#38)` — shipped the `PropsAccordion.tsx` workaround that Phase 3 removes
- `ba58fd6 refactor: migrate all compounds to Pattern A + fix docs props extraction (#36)` — superseded by Phase 3
- `docs/plans/2026-04-14-feat-docs-and-compound-conventions-improvements-plan.md` — Phase 2.5 (`/parts` subpath) retired by Phase 3

### External framework references

- Base UI — https://base-ui.com/
- Phosphor Icons — https://phosphoricons.com/
- Next.js Server Components — https://nextjs.org/docs/app/building-your-application/rendering/server-components
- Tailwind CSS v4 — https://tailwindcss.com/docs
