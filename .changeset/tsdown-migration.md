---
'@oztix/roadie-core': patch
'@oztix/roadie-components': patch
---

Migrate build pipeline from tsup to tsdown (Rolldown). Internal build-tool
change with no consumer-facing API differences — dist shape, exports map,
and type declarations are unchanged.

- Rolldown preserves `"use client"` directives on entries natively, so the
  post-build hook that previously re-inserted them is gone.
- `build:css` now invokes the `tailwindcss` bin directly instead of
  `npx @tailwindcss/cli`, eliminating stray npm warnings during builds.
- Adds `RefAttributes` to `RadioGroup.Root` and `RadioGroup.Item` prop
  types so they match the Select/Combobox/Autocomplete convention.
- Adds `docs/contributing/BASE_UI.md` as the canonical authoring guide
  for new Base UI wrappers.
