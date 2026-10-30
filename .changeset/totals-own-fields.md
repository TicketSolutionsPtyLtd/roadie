---
'@oztix/roadie-core': patch
---

Fix a table's totals row adding up fields a row inherits from its prototype. It now sums only a row's own fields, as its cells do.
