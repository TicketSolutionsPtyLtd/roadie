---
'@oztix/roadie-components': patch
---

Pressing Enter after typing in an `Autocomplete` or `Combobox` now takes the
first suggestion, without moving to it with the arrows first. Suggestions
that arrive after typing, such as server results, are highlighted too.

Opening the list without typing still highlights nothing new, so Enter there
picks no value, and an empty `Autocomplete` still submits its form. While
suggestions show for typed text, Enter fills the first one instead of
submitting; press Escape first to keep the typed text. The first Down Arrow
now moves to the second suggestion, and the arrows wrap at either end instead
of returning to the input. `Autocomplete` in `both` or `inline` mode is
unchanged, since a highlight there replaces the typed text.

Pass `autoHighlight={false}` to keep the old behaviour. `Autocomplete` also
takes `autoHighlight='always'` to highlight the first suggestion with no text.
`QueryField` is unchanged: Enter still searches the typed text unless you
arrow to a suggestion or one is marked `exact`.
