---
'@oztix/roadie-components': patch
'@oztix/roadie-core': minor
---

Show the total of a number column that comes first in `DataTable`. The totals label, each group's label, and the grouped header now go in the title column, the pinned text column or else the first text column, as in `RecordTable`. A table with no text column puts them in the first column without a sum, so the label never covers a total. `validateDashboard` follows the same rule: it warns about a totals row only when every column has a sum, or when `values` gives one for the label's column, and about grouped rows only when there's no text column and the label's column isn't status. In core, `tableLabelIndex(columns)` finds the label's column, `tableTitleColumn(columns)` the title, and `labelColumnIndex` applies the rule to columns of another shape; `totalsLabel(count, recordName, exact)` writes "Totals for 1,234 shows", with a + after a count that's a floor.
