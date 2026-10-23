---
'@oztix/roadie-components': patch
---

Fix the rows in a `QueryField` or `Records.Search` list jumping as the highlight moves. The row with the Enter hint was 1px taller than the rest, so every row below it shifted. Each row is now tall enough for the hint.
