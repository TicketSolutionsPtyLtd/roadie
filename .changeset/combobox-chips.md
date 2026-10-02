---
'@oztix/roadie-components': minor
---

`Combobox` gains chip parts for multiple selection: `Combobox.Value`,
`Combobox.Chips`, `Combobox.Chip` and `Combobox.ChipRemove`, wrapping Base
UI's. Chips are subtle pills that inherit the intent around them, with a round
remove button. Backspace in an empty input removes the last chip, and the arrow
keys move between chips.

`Combobox.InputGroup` now sets a minimum height for each size instead of a
fixed one, so it grows when chips wrap. A single line keeps its height.
