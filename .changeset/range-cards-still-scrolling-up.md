---
'@oztix/roadie-components': patch
---

Fix range-mode cards in `RecordTable` and `RecordGrid` jumping while you scroll up. When records replaced their loading placeholders above the screen, the cards on screen moved by the difference in height. This started with `@tanstack/react-virtual` 3.14.22.
