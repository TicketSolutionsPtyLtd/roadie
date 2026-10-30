---
'@oztix/roadie-components': patch
---

Fix a controlled `DataTable` that couldn't go back to its rows' own order: `sort={undefined}` handed control back to the table, so the last sort stayed. Pass `sort={null}` for a controlled table with no sort. Sorting by a status column's `order` also reads its status map once per sort, not once per row.
