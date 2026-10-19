---
'@oztix/roadie-core': patch
---

`em`, `i`, and `cite` inside `.prose` (and so `Prose`) now show
in Intermission's italic face. Before, the reset's `font-style: normal` on every
element left emphasis upright. This changes `.prose` output: CMS or markdown
content with emphasis now renders italic. Outside `.prose`, and in `.not-prose`,
these elements stay upright as before.
