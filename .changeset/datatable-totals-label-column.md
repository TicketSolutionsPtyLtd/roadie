---
'@oztix/roadie-components': patch
'@oztix/roadie-core': patch
---

Show the total of a number column that comes first in `DataTable`. The totals label, each group's label, and the grouped header now go in the first column without a sum, instead of always the first column. `validateDashboard` follows the same rule: it warns about a totals row only when every column has a sum, or when `values` gives one for the label's column, and about grouped rows only when the label's column isn't text or status.
