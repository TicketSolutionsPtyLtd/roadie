---
'@oztix/roadie-components': patch
'@oztix/roadie-core': patch
---

Large pages in Chromium no longer restyle every element when something small
changes, such as opening a menu, ticking a row, hovering a list row, or typing
in a search. On a large page inside `Navigator` or `Pane` that took up to 3
seconds of style work at 4x CPU. The styles for `List` dividers and contained
rows, `Navigator.Brand` and `Navigator.Item`, the ticket `Card` fill, the
disabled `Switch` label, `DataTable`'s Show all columns, and
`is-interactive-within` now select only what they style. Nothing looks
different.

`listItemVariants()` now carries the classes that square a row inside a
contained `List`, so a custom row built from it still matches `List.Item`.
