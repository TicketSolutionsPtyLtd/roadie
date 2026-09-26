---
'@oztix/roadie-core': minor
'@oztix/roadie-components': patch
'@oztix/roadie-charts': patch
---

Make the selected item of a `subtler` `Toggle` or `ToggleGroup` easy to see at
small sizes. The pressed item keeps its tint and adds a strong edge and
stronger text, so it holds at least 3:1 against the surface in every intent,
light or dark, where the tint alone was about 1.1:1. An unpressed `subtler`
`Toggle` now rests in subtle text, like the items of a group. Core adds the
`is-selected` utility that carries this look, with a system highlight edge
under forced colours. The `subtler` `Tabs` underline also takes the highlight
colour under forced colours. The chart card's Chart and Table switch moves up
to `md`, so each item is 32px, the size of the card's More button.
