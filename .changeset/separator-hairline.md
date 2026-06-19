---
'@oztix/roadie-components': patch
---

`Separator` now renders a true 1px hairline. The base `border` applied a width
to all four sides, so with `h-px` the top and bottom borders both painted and
read as ~2px. The colour and style now live in the base and each orientation
sets a single-side width (`border-t` / `border-l`).
