---
'@oztix/roadie-components': patch
---

`RecordTable` now sets its row height in CSS, as `--record-table-row-height`, and its window reads it once each time the table resizes. Rows stay 3rem tall. This lets narrow rows with a second line be taller without measuring each one.
