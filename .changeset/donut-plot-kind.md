---
'@oztix/roadie-core': minor
'@oztix/roadie-charts': minor
---

Add the `donut` plot kind to the dashboard description, for one whole in two to five parts: `{ kind: 'donut', data, x, y, total?, highlight? }`, with `format` and `takeaway` like the other plots. `total` labels the centre, in 20 characters or fewer. A chart document takes a `donut` plot too. `validateDashboard` and `validateChartDocument` warn at six or more parts, since the smallest roll into Other past five and a `ranked-bars` plot fits more, and at one part, which fills the ring. `plotTable` and `cardTable` from `@oztix/roadie-charts/tables` give its Table view: each part largest first, its value and share, and a total row. `DONUT_PART_CAP` in `@oztix/roadie-core/dashboard-layout` is the five-part cap. Until `DonutChart` ships, `DashboardView` and `renderChartDocument` show a donut as a chart they couldn't draw.
