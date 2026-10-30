---
'@oztix/roadie-components': patch
---

Navigator no longer logs React's "Each child in a list should have a unique
key" warning when part of a `Navigator.Item` label or a `Navigator.MenuItem`
streams in. The item's label and its menu's items were copied with
`Children.toArray` and `Children.map`, and those re-keyed copies flagged a
child that had skipped JSX's key check, such as a promise React unwraps. They
now render as given, and a streamed menu item still runs its `onSelect`.
