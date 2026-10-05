---
'@oztix/roadie-components': patch
---

`Records.Toolbar` in a `Pane` leaves room above the search, at rest and while
it sticks, so the pane header's shadow no longer covers the field. In a pane's
body it paints the pane's margins beside it, so rows scrolling up never show
there. The search shrinks before the toolbar's buttons wrap below it, so
`Records.Options` stays on the search's row on a phone. In `QueryField`, a long
chip truncates to leave the input room beside it, so one chip no longer adds an
empty second row.

A `RecordTable` in a pane's body runs edge to edge: its rows, dividers and
sideways scrollbar span the pane, and its first and last cells take the pane's
inset, so the first column lines up with the content above and columns
scrolled sideways pass under a pinned first column. Narrow rows, a boxed table
and a measured pane keep the inset.
