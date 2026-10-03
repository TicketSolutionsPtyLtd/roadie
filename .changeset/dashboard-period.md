---
'@oztix/roadie-core': minor
'@oztix/roadie-components': minor
'@oztix/roadie-charts': minor
---

Dashboards gain a period and a comparison.

`@oztix/roadie-core/dashboard`: a description can carry `period: { range,
compare?, history? }`, where `range` is a `DateRangeValue`, `compare` a
`Comparison`, and `history` (`'partial'` or `'unavailable'`) what
`resolveComparison` said about the data. A delta marked `comparison: true`
follows it. `validateDashboard` checks the period's shape, rejects custom dates
that aren't real plain dates or run backwards and hour windows (a period covers
whole days), warns about a comparison with an open-ended range, `history` with
no comparison, and a comparison delta that sets its own `context`, which never
shows, and rejects a comparison delta on a dashboard with no period. The field's
type is `DashboardPeriodSpec`.

`@oztix/roadie-components`: add `DashboardPeriod`
(`@oztix/roadie-components/dashboard-period`), one `DateRangePicker` button
with `commit='apply'` that shows the period and the dates it compares with.
Under the range, a Compare switch turns the comparison on and a toggle group
picks previous period or previous year, with the dates it covers, or "Not
enough history" or "Nothing to compare". A custom comparison set by the app
shows as Custom dates. Apply sends both together; Cancel drops both. Its value
is `DashboardPeriodValue`, `{ range, compare? }`. Its presets default to
`dashboardPeriodPresets`: next 30 and 90 days, last 30 days, last 12 months
and this financial year. `dataStart`, `dataEnd` and `alignWeekday` match the
app's `resolveComparison`, so the comparison shows the dates the app fetches.
It takes `presets`, `readOnly`, `disabled`, `timeZone`, `today`,
`weekStart`, `fiscalYearStart` and `locale`, and places `children`, such as a
benchmark, after the period. On a narrow container they stack. It has one
size, a large control: 48px tall, with the comparison's dates on a second line,
so pair it with large Buttons and Selects on the same row.

`@oztix/roadie-charts`: `DashboardView` shows a description's `period` above its
sections. `onPeriodChange` receives the new `{ range, compare? }`; without it
the period shows read-only. `periodProps` (`DashboardViewPeriodProps`) passes
the toolbar's other props. A delta marked `comparison: true` is named on its
context line ("vs previous period", over any `context` the card gives), hides
with no comparison, and gives way to "Not enough history" or "Nothing to
compare" when the period's `history` says so.
