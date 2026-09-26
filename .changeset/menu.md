---
'@oztix/roadie-components': minor
---

Add `Menu`, a dropdown list of actions that opens from a button.
`Menu.Content` wraps the portal, positioner and popup and takes `side`,
`align`, `sideOffset` and `alignOffset` directly. Items take a leading `icon`,
a trailing `shortcut` and an `intent` (use `danger` for destructive actions).
`Menu.Item` takes an `href`, routed through `RoadieLinkProvider`. Checkbox and
radio items, groups with labels, separators and submenus are included, and
Navigator menus now share the same surface and row styles. On a touch screen a
tapped row that keeps the menu open no longer stays highlighted; the keyboard
highlight still shows.
