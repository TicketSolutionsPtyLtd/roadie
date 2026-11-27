---
'@oztix/roadie-components': patch
---

Fix the cursor on a RecordBoard card with a link. It showed a pointer over the whole card, because the link's overlay covers it. It now shows the grab cursor, as on a card without a link, and grabbing while the card is dragged. A button or field inside the card keeps its own cursor. `Sortable.Item` with `dragFrom='item'` does the same for any link marked `data-interactive-target`.
