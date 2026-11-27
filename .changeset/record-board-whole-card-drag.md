---
'@oztix/roadie-components': minor
---

Add `dragFrom` to `Sortable.Item`. Set it to `'item'` and a pointer picks the item up from anywhere on it, not just its handle, while a click still follows its links and presses its buttons. `RecordBoard` uses it, so a card drags from anywhere on it, and a column takes a drop anywhere in it, including the empty space below its cards.
