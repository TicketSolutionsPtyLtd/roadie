---
'@oztix/roadie-components': patch
---

`Records.Toolbar` in a `Pane` leaves room above the search, at rest and while
it sticks, so the pane header's shadow no longer covers the field, and the
column headers stick under the taller toolbar. The search shrinks before the
toolbar's buttons wrap below it, so `Records.Options` stays on the search's row
on a phone. In `QueryField`, a long chip truncates to leave the input room
beside it, so one chip no longer adds an empty second row.
