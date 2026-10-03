---
'@oztix/roadie-components': patch
---

Centre `Sortable.Handle` in its row. The handle took the `btn` utility's
`place-self: start`, which overrode a row's `items-center` and pinned the
grabber to the top of pills, taller cards and reorderable `List` rows.
