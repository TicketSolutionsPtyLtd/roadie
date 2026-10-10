---
'@oztix/roadie-components': patch
---

A `Pane` now remembers its scroll for the history entry you're on, even after
a push that keeps the same `Navigator` value, such as a change to the query
alone. Before, it kept saving to the entry it was on before the push, so going
back put the pane at the newer entry's position. Going back or forward to an
entry on the same route now restores that entry's scroll too.
