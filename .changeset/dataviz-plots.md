---
'@oztix/roadie-charts': minor
'@oztix/roadie-core': minor
---

Nine chart types for event and ticketing insights, built on TanStack Charts:
`LineChart` (with band, median, forecast, target, today and annotations),
`BarChart`, `RankedBars`, `StackedBars`, `Histogram`, `Funnel`, `Heatmap`,
`Scatter` and `SmallMultiples`. Each renders live with Roadie tokens, on the
server, and as standalone SVG through `renderChartSvg` in
`@oztix/roadie-charts/static`, which also exports each chart's definition.
Each chart's Table view rows come from `@oztix/roadie-charts/tables`, which a
server can call without the chart engine. A chart inside a `Chart` card now
supplies the card's table and summary, so `table` is optional, and a chart
that can't draw puts its card in the error state.

In core, a chart card's `plot` accepts every chart kind, each with its own
schema exported from `@oztix/roadie-core/dashboard`, and `validateDashboard`
checks plot fields, annotations outside the data and repeated names.
`parseWallTime` in `@oztix/roadie-core/dataviz` reads an ISO string as venue
wall time, and `isWallTime` says whether a value is one. Both read the whole
string and refuse a date that doesn't exist, such as 31 February. `--chart-highlight` now follows nested accent, dark and
intent sections.
