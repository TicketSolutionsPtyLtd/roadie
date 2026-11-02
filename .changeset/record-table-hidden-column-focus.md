---
'@oztix/roadie-components': patch
---

Fix `RecordTable` sometimes dropping focus to the page when a narrower width hides the column holding it, on a busy device where the browser blurs the hidden control before the table sees the column go. Focus moves to the table, as it does otherwise.
