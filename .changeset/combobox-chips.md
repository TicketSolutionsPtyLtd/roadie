---
'@oztix/roadie-components': minor
---

`Combobox` gains chip parts for multiple selection: `Combobox.Value`,
`Combobox.Chips`, `Combobox.Chip` and `Combobox.ChipRemove`, wrapping Base
UI's, and `Combobox.ChipLabel`, which truncates a long value. Chips are subtle
pills that inherit the intent around them, with a round remove button.
Backspace in an empty input removes the last chip, and the arrow keys move
between chips.

`Combobox.InputGroup` and `comboboxInputGroupVariants` now set a minimum height
for each size (`min-h-8`, `min-h-10`, `min-h-12`) instead of a fixed `h-*`, so
the group grows when chips wrap. A single line keeps its height, but a child
sized with `h-full` now takes its content's height instead of the group's.
