---
'@oztix/roadie-components': minor
---

`Combobox.Chip` turns accent strong while it has focus, to show it's selected,
with the same rest, hover, focus and press states as an accent strong `Button`,
whatever its own intent. Its `Combobox.ChipRemove` reads in the on-strong colour
there. Clicking a chip selects it instead of jumping to the input. Backspace in an empty
`Combobox.Input` selects the last chip, and a second Backspace removes it, so
a value is never dropped without a warning. An `onKeyDown` that calls
`preventBaseUIHandler` keeps its own Backspace. Escape on a chip returns to the
input and keeps every value. A chip without `Combobox.ChipRemove` pads both
ends alike. `selected` on `Combobox.Chip` gives it the same selected look while
focus stays elsewhere, such as in the input.

`Records` takes `RecordsField`, a `RecordField` with an optional `icon`.
`Records.Search` shows it on the field's suggestions and their filters, or an
icon for the field's type when it has none.
