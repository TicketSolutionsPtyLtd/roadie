---
'@oztix/roadie-components': minor
'@oztix/roadie-core': minor
'@oztix/roadie-charts': minor
---

Add `groupBy` and `defaultExpanded` to `DataTable`. Rows group by one or more text or status columns, outermost first. Each group gets a row that sums its number columns the way `totals` does, which opens and closes like an Accordion when anywhere on it is pressed, and every level's label sits indented in the first column. Groups start closed: `defaultExpanded` opens them all, or the groups at the paths of values you give. Sorting orders groups by their sums, or by label, at every level. Dashboard `table` cards take the same two fields, `DashboardView` passes them on, and `validateDashboard` checks them.
