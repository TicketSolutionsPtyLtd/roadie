---
'@oztix/roadie-core': patch
---

Move the `cn()` family members (intent, emphasis, semantic colour, text style, motion, layering, link, and prose size utilities) from `src/css/safelist.html` to a generated `src/css/safelist.families.html`. `roadie.compiled.css` and `cn()` output are unchanged. An app whose CSS points `@source` at core's `safelist.html` adds a second `@source` for `safelist.families.html`.
