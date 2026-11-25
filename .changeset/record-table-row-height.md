---
'@oztix/roadie-components': patch
---

`RecordTable` now sets its row height in CSS, and its window reads it once each time the table resizes instead of assuming 3rem. Rows stay 3rem tall. This lets narrow rows with a second line be taller without measuring each one.
