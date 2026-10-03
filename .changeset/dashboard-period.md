---
'@oztix/roadie-core': minor
'@oztix/roadie-components': minor
'@oztix/roadie-charts': minor
---

Dashboards gain a period and a comparison.

`@oztix/roadie-core/dashboard`: a description can carry
`period: { range, compare?, history? }`, where `range` is a `DateRangeValue`,
`compare` a `Comparison`, and `history` (`'partial'` or `'unavailable'`) what
`resolveComparison` said about the data. A delta marked `comparison: true`
follows it. `validateDashboard` checks the period's shape, rejects custom
dates that aren't real plain dates or run backwards, warns about a
comparison with an open-ended range or `history` with no comparison, and
rejects a comparison delta on a dashboard with no period. The field's type
is `DashboardPeriodSpec`.

`@oztix/roadie-components`: add `DashboardPeriod`
(`@oztix/roadie-components/dashboard-period`), a `DateRangePicker` with
`commit='apply'` and a comparison `Select` beside it: previous period,
previous year, custom dates (with a second picker) or none, each with the
dates it covers. Its value is `DashboardPeriodValue`, `{ range, compare? }`.
It takes `presets`, `readOnly`, `disabled`, `size`, `timeZone`, `today`,
`weekStart`, `fiscalYearStart` and `locale`, and places `children`, such as
a benchmark, after the comparison. On a narrow container its controls stack.

`@oztix/roadie-charts`: `DashboardView` shows a description's `period` above
its sections. `onPeriodChange` receives the new `{ range, compare? }`;
without it the period shows read-only. `periodControl` passes the toolbar's
other props. A delta marked `comparison: true` is named on its context line
("vs previous period"), hides with no comparison, and gives way to "Not
enough history" or "Nothing to compare" when the period's `history` says so.
