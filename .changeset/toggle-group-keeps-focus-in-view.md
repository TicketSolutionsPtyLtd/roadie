---
'@oztix/roadie-components': patch
---

Fix a scrolling `ToggleGroup` jumping back to its pressed item when it resized while keyboard focus was on another item, which hid the focused item. It now keeps the focused item in view, and the pressed one when focus is elsewhere.
