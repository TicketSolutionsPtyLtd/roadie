---
'@oztix/roadie-charts': minor
'@oztix/roadie-components': minor
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

Cards take actions at the top right. `Chart` has an `actions` prop that sits
after the Chart and Table switch, and `DashboardView` has a `cardActions`
render prop that adds actions to every card kind described as data.
`DataCard.MoreButton` is the More button that ends a card's actions. It passes
its props and ref through, so it can become a menu trigger. `DataCard` now
shows its actions in every state, so a refresh works on a card that failed to
load; `Chart` hides only its view switch without data. Repeated `BarChart`
x values add up their bars, and the `line` keeps the first value it has.

In core, a chart card's `plot` accepts every chart kind, each with its own
schema exported from `@oztix/roadie-core/dashboard`, and `validateDashboard`
checks plot fields, annotations outside the data and repeated names.
`parseWallTime` in `@oztix/roadie-core/dataviz` reads an ISO string as venue
wall time, and `isWallTime` says whether a value is one. Both accept a space
in place of the `T`, as in `2026-11-14 19:30`, read the whole string and
refuse a date that doesn't exist, such as 31 February. `--chart-highlight` now follows nested accent, dark and
intent sections. Inline `code` no longer splits a short name across lines; it
breaks mid-token only when the token can't fit a line.
