---
'@oztix/roadie-components': patch
---

Pressing Enter after typing in an `Autocomplete` or `Combobox` now takes the
first suggestion, without moving to it with the arrows first.

`Autocomplete` highlights the first suggestion whenever suggestions show
(`autoHighlight` defaults to `'always'`), so the first Down Arrow now moves to
the second suggestion. In `both` and `inline` mode it stays `false`, since a
highlight there replaces the typed text. `Combobox` highlights the first match
once the user types (`autoHighlight` defaults to `true`); opening the list
without typing highlights nothing new, so Enter can't pick a value nobody
chose. With a highlight, the Up Arrow on the first item wraps to the last
instead of returning to the input. Pass `autoHighlight={false}` to keep the
old behaviour.

`QueryField` is unchanged: Enter still searches the typed text unless you
arrow to a suggestion or one is marked `exact`.
