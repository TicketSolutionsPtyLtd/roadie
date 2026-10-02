---
'@oztix/roadie-core': minor
'@oztix/roadie-components': minor
'@oztix/roadie-charts': minor
---

`DataTable` takes a totals row with `totals`, rendered in a new `Table.Foot`:
strong text over a rule, its label in the first column as a row header. `true`
or `'sum'` adds up the number columns over every row, labelled "Totals for 12
records", or the `recordName` you pass. Shares, indexes, points and columns with
`total: false` stay blank, and currency sums round to the cent. Give
`{ label, values }` to show your own figures, such as the server's totals for a
paged report or an average; with `values`, nothing is summed, and without a
label the row reads "Totals". The first column holds the label, so it never
hides while the totals show. `DataTableTotals` types the prop, `true`
included, and `tableCellClass(align)` gives a body cell's classes, for a `th`
that heads a row.

A dashboard table card takes the same `totals`, and columns take `total: false`.
`validateDashboard` checks them: values need a label and must name a column,
`'sum'` warns when there's nothing to sum, and either warns when the first
column, which holds the label, has a total that would never show.
`cardTable(card)` returns the totals summed, and a `Chart` table view shows a
`ChartTable`'s totals. In core,
`resolveTableTotals(columns, rows, totals)`, `isSummable(column)` and the
`RecordName` and `ResolvedTotals` types come from
`@oztix/roadie-core/dashboard` and the Zod-free `/dashboard-layout`.
