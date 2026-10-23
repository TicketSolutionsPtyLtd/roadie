---
'@oztix/roadie-components': patch
---

`RadioGroup` now dims a disabled group or item and ignores presses on its row, like `Checkbox`. An invalid group, from `invalid` or its `Field`, draws its empty circles with a danger border and tint, fills the chosen one with danger like an invalid ticked `Checkbox`, and sets `aria-invalid` on the `radiogroup`.
