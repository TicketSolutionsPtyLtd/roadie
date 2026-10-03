---
'@oztix/roadie-components': patch
---

`Autocomplete` and `Combobox` now list the closest matches first as you type,
so the highlighted first option, and Enter, take the likeliest one. An exact
match leads, then labels that start with the text, then labels with a word
that starts with it, then labels that contain it anywhere. Matches of the same
kind keep the order of `items`, grouped items are ranked within their group,
and case and accents don't count. Typing "Rock" over `['Hard rock', 'Rock']`
now lists Rock first. With `limit`, ranking comes first, so the closest
matches are the ones kept.

`Combobox` opened without typing still shows `items` in your order.
`Autocomplete` ranks by its value, whether typed or set in code. Pass your own
`filter` or `filteredItems` to keep your order. Server results passed as
`items` without `filter={null}` are now re-ranked; add `filter={null}` to keep
the server's order. A `Combobox` given a `createItems()` collection keeps its
order.

The docs' grouped examples mapped the source groups inside `List`, which never
filtered. Pass a function to `Autocomplete.List` or `Combobox.List` instead, as
the examples now do, so groups filter and rank.
