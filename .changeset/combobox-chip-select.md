---
'@oztix/roadie-components': minor
---

`Combobox.Chip` turns accent strong while it has focus, to show it's selected,
with the rest, hover, focus, and press states of an accent strong `Button`,
whatever its own intent. Its `Combobox.ChipRemove` reads in the on-strong
colour there. A click on a chip selects it, rather than moving to the input.
Backspace in an empty `Combobox.Input` selects the last chip, and a second
Backspace removes it, so no value goes without a warning. An `onKeyDown` that
calls `preventBaseUIHandler` keeps its own Backspace. Escape on a chip returns
focus to the input and keeps every value. Escape in the input while the list
is closed clears the typed text and keeps every chip, where Base UI removes
them all. A chip without `Combobox.ChipRemove` has the same padding at both
ends. Set `selected` on `Combobox.Chip` to show it selected while focus stays
elsewhere, such as in the input. `autoHighlight='always'` highlights the
first item with no text too, as it does on `Autocomplete`.

`Records` takes `RecordsField`, a `RecordField` with an optional `icon`.
`Records.Search` shows it on the field's suggestions and their filters, or an
icon for the field's type when it has none.
