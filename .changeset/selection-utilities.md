---
'@oztix/roadie-core': minor
'@oztix/roadie-components': patch
---

Add selection utilities, so a set of choices takes its label colours from the system rather than from each component. `is-selectable` marks an unchosen item: subtle text that lifts to normal text on hover. `is-selected-label` and `is-selected-label-on-strong` give a chosen item the label of `is-selected` or `emphasis-strong` when an indicator behind it draws the fill.

`Toggle`, `ToggleGroup` and `Tabs` now compose these utilities. The one visible change: an unpressed `subtler` `Toggle` now lifts its label to normal text on hover, as `ToggleGroup` and `Tabs` items already did.
