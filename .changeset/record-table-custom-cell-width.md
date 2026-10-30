---
'@oztix/roadie-components': patch
---

Fix `RecordTable` sizing a column with a custom `cell` for "Not available" when its values are empty; the custom cell shows its own empty state. `useRecords` now compares filters, sort, and scope deeply instead of through JSON, so a `NaN` value no longer reads as `null`.
