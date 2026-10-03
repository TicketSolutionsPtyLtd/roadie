---
'@oztix/roadie-components': patch
---

`Autocomplete` and `Combobox` options can be chosen with a tap on an iPhone.
Base UI cancels an option's `pointerdown` to keep the input focused, and WebKit
then drops the tap's click, so a tapped suggestion closed the list without
choosing. A touch now keeps its click, and its `mouseup` no longer chooses a
second time. This also fixes date suggestions in `DateField`, `DatePicker` and
`DateRangePicker`.
