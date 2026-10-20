---
'@oztix/roadie-components': patch
---

Update the `Select`, `Combobox`, and `Autocomplete` popups, the `QueryField`
operator bar, the `Popover` arrow, and the `Tooltip` arrow to use
`--intent-bg-floating`, so in dark mode they match the lifted fill of other
floating surfaces.

A raised `Pane` and the inspector drawer publish the fill they paint as
`--pane-surface`, so their sticky header matches the lifted dark fill.
