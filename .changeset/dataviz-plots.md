---
'@oztix/roadie-charts': minor
'@oztix/roadie-core': minor
---

Nine chart types for event and ticketing insights, built on TanStack Charts:
`LineChart` (with band, median, forecast, target, today and annotations),
`BarChart`, `RankedBars`, `StackedBars`, `Histogram`, `Funnel`, `Heatmap`,
`Scatter` and `SmallMultiples`. Each renders live with Roadie tokens, on the
server, and as standalone SVG through `renderChartSvg` in
`@oztix/roadie-charts/static`. A chart inside a `Chart` card now supplies the
card's table and summary, so `table` is optional.

In core, a chart card's `plot` accepts every chart kind, each with its own
schema exported from `@oztix/roadie-core/dashboard`, and `validateDashboard`
checks plot fields. `--chart-highlight` now follows nested accent, dark and
intent sections.
