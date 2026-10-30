---
'@oztix/roadie-core': patch
---

Fix the `btn` utilities resizing icons inside components nested in a button, such as a `Badge`, `IconTile` or `Avatar`. The button's icon sizing now carries only the button class's weight, so a nested component's own icon classes win. A `w-*`/`h-*` class on a button's own icon now applies too, where the button used to override it.
