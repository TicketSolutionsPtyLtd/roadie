---
'@oztix/roadie-components': patch
---

`RadioGroup` now dims a disabled group or item and ignores presses on its row, like `Checkbox`. An invalid group, from `invalid` or its `Field`, draws every circle with a danger border and tint, gives the chosen one a danger dot, and sets `aria-invalid` on the `radiogroup`.
