---
'@oztix/roadie-components': patch
---

Ticking a record no longer re-renders the search, pagination, view settings and every other row: `Records` shares its state in parts that change at different rates, and a table row re-renders only when its own selection changes. Ticking one row of a 100-row `RecordTable` now re-renders 51 components rather than 197.
