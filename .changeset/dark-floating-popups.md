---
'@oztix/roadie-components': patch
---

Update the `Select`, `Combobox`, and `Autocomplete` popups, the `QueryField`
operator bar, the `Popover` arrow, and the `Tooltip` arrow to use
`--intent-bg-floating`, so in dark mode they match the lifted fill of other
floating surfaces. The three popups also lift `text-subtle` on that fill, as
`emphasis-floating` does, so group labels and empty messages keep their
contrast.

A raised `Pane` and the inspector drawer publish the fill they paint as
`--pane-surface`, so their sticky header matches the lifted dark fill, and
`Pane.Search` lifts its field off a raised `Pane` in dark mode.
