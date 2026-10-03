---
'@oztix/roadie-components': patch
---

`Autocomplete` and `Combobox` now list the closest matches first as you type,
so the highlighted first option, and Enter, take the likeliest one. An exact
match leads, then labels that start with the text, then labels with a word
that starts with it, then labels that contain it anywhere. Matches of the same
kind keep the order of `items`, grouped items are ranked within their group,
and case and accents don't count. Typing "Rock" over `['Hard rock', 'Rock']`
now lists Rock first.

Opening the list without typing still shows `items` in your order. Pass your
own `filter` or `filteredItems`, or `filter={null}` for server results, to
keep your order while typing.
