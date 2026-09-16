---
title: A second substantial exported function in a component file empties the whole PropsDefinitions table
date: 2026-07-28
category: build-errors
problem_type: docs_tooling_extraction
components:
  - docs/src/components/PropsDefinitions.tsx
  - packages/components/src/components/Navigator
keywords:
  - react-docgen-typescript
  - PropsDefinitions
  - empty props table
  - missing props table
  - component detection
  - borrowed JSDoc
  - wrong section description
severity: medium
related_files:
  - packages/components/src/components/Navigator/NavigatorPrimary.tsx
  - packages/components/src/components/Navigator/mobileSlots.ts
  - docs/solutions/build-errors/react-docgen-cva-literal-props.md
---

# A second substantial exported function empties the whole PropsDefinitions table

## Symptom

`NavigatorPrimary`'s entire props table rendered **empty** on the docs site —
not missing one prop (the CVA-literal-union failure mode already documented in
[`react-docgen-cva-literal-props.md`](react-docgen-cva-literal-props.md)), but
zero rows for a component with a normal, well-typed prop list. Worse,
`<PropsDefinitions>`'s section description was not blank — it had silently
borrowed the JSDoc comment belonging to `deriveMobileSlots`, a second exported
function living in the same file, and displayed that as if it described
`NavigatorPrimary`.

This is a distinct failure from the CVA case: that one drops individual props
from an otherwise-correct table. This one makes `react-docgen-typescript` lose
the component itself.

## Root cause

`NavigatorPrimary.tsx` exported two substantial things: the `NavigatorPrimary`
component and a `deriveMobileSlots` function containing real logic (with its
own JSDoc block) — not a trivial one-line helper. `react-docgen-typescript`
walks a source file looking for the exported symbol that looks most like a
component to attach the extracted prop metadata to. With two exports of
comparable weight in one file, its heuristic picked the wrong anchor: it
attached `deriveMobileSlots`'s JSDoc as the "component description" and never
resolved `NavigatorPrimary`'s own prop interface, so the table came back
empty.

The earlier, better-known failure mode (`VariantProps<typeof v>['key']`
defeating literal-value extraction) still applies to _individual props_. This
one applies to the _whole component_ and only shows up once a file grows a
second exported function large enough to look like a candidate.

## Fix

Extract the second function into its own module and re-export it from the
component file, so `NavigatorPrimary.tsx` once again has exactly one
substantial export. This is not a new pattern — the repo already does it for
`paneStack.ts` and `sectionMemory.ts`:

```ts
// packages/components/src/components/Navigator/mobileSlots.ts
export type NavigatorSlotMeta = { ... }
export type MobileSlots = { ... }

/** ...deriveMobileSlots' own JSDoc... */
export function deriveMobileSlots(...): MobileSlots { ... }
```

```ts
// packages/components/src/components/Navigator/NavigatorPrimary.tsx
import {
  type MobileSlots,
  type NavigatorSlotMeta,
  deriveMobileSlots
} from './mobileSlots'

// Re-exported from `./mobileSlots` so it doesn't share a file (and confuse
// react-docgen-typescript's component detection) with NavigatorPrimary.
export { deriveMobileSlots }
```

The public import surface is unchanged — consumers importing from the
component's barrel see the same names. Only the file boundary moved.

## Prevention

- **A component file should export exactly one component-shaped thing.** A
  second exported function with its own non-trivial JSDoc is enough to
  confuse `react-docgen-typescript`'s heuristic, even though the file still
  compiles and type-checks cleanly — there is no TypeScript error to catch
  this.
- **When a component file needs a real helper function (not a one-liner),
  extract it to its own module and re-export it**, matching the existing
  `paneStack.ts` / `sectionMemory.ts` / `mobileSlots.ts` convention.
- **After adding or changing a component's exports, load the docs page and
  check the PropsDefinitions table is non-empty and its description matches
  the component**, not just that individual props appear correctly. An empty
  table with a plausible-looking (but wrong) description is easy to skim past
  — the description reads as real prose, not an error.
- **This is distinct from the CVA literal-union case.** That failure drops one
  prop from a table that otherwise renders correctly. This failure drops the
  whole table and mis-describes the component. If a props table is present
  but missing one prop, look at that prop's type first
  (`react-docgen-cva-literal-props.md`). If the table is empty or the
  description looks unrelated to the component, look for a second substantial
  export in the same file.

## Related files

- `packages/components/src/components/Navigator/NavigatorPrimary.tsx` — where
  the empty table was found and the re-export shim now lives.
- `packages/components/src/components/Navigator/mobileSlots.ts` — the
  extracted module holding `deriveMobileSlots`, `NavigatorSlotMeta`,
  `MobileSlots`, `NavigatorTabSlots`.
- `docs/src/components/PropsDefinitions.tsx` — the extraction pipeline this
  affects.
- [`react-docgen-cva-literal-props.md`](react-docgen-cva-literal-props.md) —
  the related but distinct per-prop extraction failure.
