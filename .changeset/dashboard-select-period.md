---
'@oztix/roadie-charts': minor
---

Add `selectsPeriod` to `DashboardView`, so a drag across a line or bar card with dated x, or Shift with an arrow key and then Enter, sets the dashboard's period. The app picks the cards, and `onPeriodChange` gets the range with the current comparison. Dashboards without it don't change.
