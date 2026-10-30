---
'@oztix/roadie-components': patch
---

Fix toggling a `Sortable.Item`'s `disabled` rebuilding its drop target too, which cleared a drop line it was showing. Dragging and taking drops now register separately, so only the drag comes and goes with `disabled`.
