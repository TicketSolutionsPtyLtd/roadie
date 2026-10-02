---
'@oztix/roadie-core': minor
---

Emphasis surfaces now set `--surface-tint-bg` and `--surface-tint-text`, the
fill and label a translucent chip should take on them. `emphasis-strong` gives
its pressed tone and its label colour, `emphasis-inverted` and the overlays a
15% tint of their label, and the opaque light surfaces (`emphasis-normal`,
`-raised`, `-floating`, `-sunken`, `-field`) and `is-selected` clear them. They
inherit, so the nearest surface wins. Use them with a fallback, as in
`var(--surface-tint-bg, var(--intent-bg-subtle))`.
