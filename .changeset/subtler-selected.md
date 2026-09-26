---
'@oztix/roadie-core': minor
'@oztix/roadie-components': patch
'@oztix/roadie-charts': patch
---

Make the selected item of a `subtler` `Toggle` or `ToggleGroup` easier to see.
A pressed `subtler` toggle or group item now takes a soft fill with no border
and a strong icon or label. The fill alone stays under 3:1 against the
surface, so the fill and the icon carry the state together: use `subtler` for
quiet controls, and `subtle` or `normal` when the state must stand out. On the
unpressed side, a `subtler` `Toggle` now rests in subtle text rather than
normal text, like the items of a group. Core adds the `is-selected` utility
that carries this look, with a system highlight edge under forced colours.
The `subtler` `Tabs` underline keeps its look and now takes the highlight
colour under forced colours, where it used to disappear. The chart card's
Chart and Table switch moves up to `md`, so each item is 32px, the size of the
card's More button.
