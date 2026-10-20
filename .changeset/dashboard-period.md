---
'@oztix/roadie-core': minor
'@oztix/roadie-components': minor
'@oztix/roadie-charts': minor
---

Dashboards gain a period and a comparison.

`@oztix/roadie-core/dashboard`: a description can carry `period: { range,
compare?, history? }` (`DashboardPeriodSpec`), where `range` is a
`DateRangeValue`, `compare` a `Comparison` or the app's own, such as
`'similar'`, and `history` what `resolveComparison` said about the data. A
delta marked `comparison: true` follows it. `validateDashboard` checks the
period, and rejects a comparison delta on a dashboard with no period.

`@oztix/roadie-components`: add `DashboardPeriod`
(`@oztix/roadie-components/dashboard-period`), one `DateRangePicker` button
that shows the period and the dates it compares with. Under the range, a
Compare switch turns the comparison on, and a toggle group picks previous
period, previous year, custom dates, or the app's own options from
`compareOptions`. Apply sends both together. Its value is
`DashboardPeriodValue`, `{ range, compare? }`, and its presets default to
`dashboardPeriodPresets`. `dataStart`, `dataEnd`, and `alignWeekday` match the
app's `resolveComparison`, so the comparison shows the dates the app fetches.
It's a large control, 48px tall, so pair it with large Buttons and Selects.

`@oztix/roadie-charts`: `DashboardView` shows a description's `period` above its
sections, and `onPeriodChange` receives the new `{ range, compare? }`; without
it the period shows read-only. `periodProps` (`DashboardViewPeriodProps`)
passes the toolbar's other props. A delta marked `comparison: true` names the
comparison on its context line, such as "vs previous period", and gives way to
"Not enough history" or "Nothing to compare" when the period's `history` says
so.
