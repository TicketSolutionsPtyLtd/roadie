---
'@oztix/roadie-components': minor
---

`virtualized` on `Combobox`, `Autocomplete` and `CommandPalette` now windows grouped items too, drawing only the rows near the scroll position. The label of the group in view sticks to the top of the list, and stays mounted while any of its rows is drawn, so the group keeps its name. Each row's `aria-setsize` and `aria-posinset` count within its group. `CommandPalette` no longer draws every grouped command or warns in development.
