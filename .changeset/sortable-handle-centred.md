---
'@oztix/roadie-components': patch
---

`Sortable.Handle` now follows its row's alignment, so it is centred in
`items-center` rows. It took the `btn` utility's `place-self: start`, which
overrode the row's `items-center` and pinned the grabber to the top of pills,
taller cards and reorderable `List` rows.
