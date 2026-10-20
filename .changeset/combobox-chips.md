---
'@oztix/roadie-components': minor
---

`Combobox` gains chip parts for multiple selection: `Combobox.Value`,
`Combobox.Chips`, `Combobox.Chip`, and `Combobox.ChipRemove`, wrapping Base
UI's, and `Combobox.ChipLabel`, which truncates a long value. Chips are subtle
pills that inherit the intent around them, with a round remove button.

The arrow keys move between chips, and a chip with focus turns accent strong
to show it's selected. Clicking a chip selects it. Backspace in an empty
`Combobox.Input` selects the last chip, and a second Backspace removes it.
Escape on a chip returns focus to the input, and Escape in the input while the
list is closed clears the typed text and keeps every chip, where Base UI
removes them all. `selected` on `Combobox.Chip` shows it selected while focus
stays elsewhere.

`Combobox.InputGroup` and `comboboxInputGroupVariants` now set a minimum height
for each size (`min-h-8`, `min-h-10`, `min-h-12`) instead of a fixed `h-*`, so
the group grows when chips wrap. A single line keeps its height, but a child
sized with `h-full` now takes its content's height instead of the group's.

`Combobox` takes `autoHighlight='always'` to highlight the first item before
anything is typed, as `Autocomplete` does.
