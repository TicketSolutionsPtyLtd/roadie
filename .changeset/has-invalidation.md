---
'@oztix/roadie-components': patch
'@oztix/roadie-core': patch
---

Large pages no longer restyle every element when something small changes.
Chromium gathers whatever a stylesheet selects after a `:has()` into one set,
and Navigator and Pane anchor a `:has()` above the whole page, so opening a
menu, ticking a row, hovering a list row or typing in a search restyled nearly
every element: up to 3 seconds of style work at 4x CPU on a large docs page.
Rules that put `*`, a tag or `[data-slot]` after a `:has()` now end on a
class, a variable or a rare attribute instead: `List` dividers and contained
rows, the wordmark-only `Navigator.Brand` logo, the iconless `Navigator.Item`
label, the navigation gutter, the ticket `Card` fill, the disabled `Switch`
label, `DataTable`'s Show all columns and `is-interactive-within`'s raised
controls. A test keeps the stylesheet free of the pattern.

`listItemVariants()` now carries the classes that square a row inside a
contained `List`, so a custom row built from it still matches `List.Item`.
