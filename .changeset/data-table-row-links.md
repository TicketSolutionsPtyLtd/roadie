---
'@oztix/roadie-components': minor
'@oztix/roadie-charts': minor
---

`DataTable` links rows with `getRowHref`. The title cell, the pinned text
column or else the first text column, becomes a link routed through
`RoadieProvider`, with external links opening in a new tab. Its overlay covers
the row, so pressing anywhere on it follows the link, and the row takes the
link's hover tint and focus ring. The link is the row's only tab stop.
`getRowHref` runs where the table renders, so a server component can pass it.

`DashboardView` takes `getRowHref={(card, row) => …}` to link table card rows,
since a dashboard description is JSON and holds no functions.
