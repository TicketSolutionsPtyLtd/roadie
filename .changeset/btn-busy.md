---
'@oztix/roadie-core': minor
---

Add a pending look to the `btn` utility: an element with `btn` and `aria-busy='true'` keeps its size, hides its label after 200ms, and shows a spinner in the label's colour, undimmed even when it is also disabled. Any `btn` that already sets `aria-busy='true'` now shows it, such as Records' bulk and row action buttons while their action runs.
