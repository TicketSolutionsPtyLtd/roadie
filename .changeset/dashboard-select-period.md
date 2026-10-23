---
'@oztix/roadie-core': minor
'@oztix/roadie-charts': minor
---

Add `selectsPeriod` to the `line`, `bar`, and `stacked-area` plots of a dashboard description, so a drag across that card, or Shift with an arrow key and then Enter, sets the dashboard's period. `DashboardView` passes the range to `onPeriodChange` with the current comparison, and `validateDashboard` warns when x isn't dated or there's no period. Dashboards without it don't change.
