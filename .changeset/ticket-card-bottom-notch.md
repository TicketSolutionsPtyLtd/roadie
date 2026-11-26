---
'@oztix/roadie-components': patch
---

A raised ticket `Card` with `direction='horizontal'`, or `'auto'` once it splits, no longer casts its shadow across the mouth of its bottom notch. On a horizontal or auto ticket with a footer, the card is now `position: relative` and isolated, and each part clips its own content rather than the card clipping them all. So an absolutely positioned child now positions against the card's body column, content that straddles the join is clipped by its part, and nothing inside the card stacks above the cards after it.
