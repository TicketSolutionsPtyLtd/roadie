---
'@oztix/roadie-components': minor
---

Add `Menu`, a dropdown of actions built on Base UI's menu primitive.
`Menu.Content` wraps the portal, positioner and popup and takes `side`,
`align`, `sideOffset` and `alignOffset` directly. Items take a leading `icon`,
a trailing `shortcut` and an `intent` (use `danger` for destructive actions).
`Menu.LinkItem` routes its `href` through `RoadieLinkProvider`. Checkbox and
radio items, groups with labels, separators and submenus are included, and
Navigator menus now share the same surface and row styles.
