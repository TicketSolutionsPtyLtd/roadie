---
'@oztix/roadie-components': minor
---

Add connected lists to `Sortable`. Roots that share a `group`, each with its own `value`, drag items between each other: the list an item lands in calls `onTransfer({ value, from, to, index })`, and `canDrop` can turn an item down. A list without `onTransfer` takes nothing from the others, and a `Sortable` without `group` works as before.
