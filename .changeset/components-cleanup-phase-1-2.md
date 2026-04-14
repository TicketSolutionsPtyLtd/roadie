---
'@oztix/roadie-components': minor
---

Components consistency cleanup, Phases 1 & 2 of the `2026-04-15-refactor-components-consistency-cleanup-plan`. No runtime behaviour change; the minor bump is for the server-safety improvement plus the removal of three `@deprecated` type aliases.

**New: server-safe by default.** `Input`, `Textarea`, and `Highlight` no longer emit `'use client'`. Consumers can render them from Next.js server components without forcing a client boundary. Verified on the compiled dist — the entries no longer start with the directive. Existing client-component usage continues to work unchanged.

**Removed: deprecated type aliases.** The three `@deprecated` aliases left in place by the Pattern A migration (#36) are deleted:

- `SelectRootProps` → use `SelectProps`
- `ComboboxRootProps` → use `ComboboxProps`
- `AutocompleteRootProps` → use `AutocompleteProps`

Also removed (never re-exported from the package barrel, so not part of the documented surface): `SelectTriggerVariantProps` (misnamed re-export) and the `HighlightChunk` type export (kept as a local type inside `Highlight/index.tsx`).

**Internal cleanups (no API change):**

- Every Phosphor import in the components package now uses `@phosphor-icons/react/ssr` (Accordion, Select, Combobox, Autocomplete, Steps; Carousel was already on `/ssr`). One import path now works in both server and client components.
- `Steps` and `Carousel` `direction` variant entries switched from dead `''` strings to `undefined` so the variant API stays intact without stringly-typed noise.
- `Highlight`'s redundant `query === ''` clause dropped (already covered by `!query`).
- `BASE_UI.md` §7 gained a "server-safe by default" authoring rule, and the §11 skeleton template's `Object.assign` form was replaced with direct assignment + a `TODO(Phase 3)` marker pointing at the upcoming `export * as` migration.
