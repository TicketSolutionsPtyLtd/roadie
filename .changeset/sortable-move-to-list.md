---
'@oztix/roadie-components': minor
---

Add "Move to" items to `Sortable`'s Move menu for connected lists. Each item's menu offers every other list in its `group` that would take it, named by that list's `label`, as in "Move Date to done". The item lands at the end of that list through the same `onTransfer` as a drop, the list it joins announces the move, and focus follows it. A list whose `canDrop` turns the item down, or that is disabled or has no `onTransfer`, isn't offered.
