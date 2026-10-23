---
'@oztix/roadie-core': minor
'@oztix/roadie-charts': minor
---

Add an `eventTime` x format to LineChart and the dashboard `line` plot, for comparing events on their own clock. `x` is hours from midnight starting the first event day, and a day runs to 6am. Ticks read "Day 2" and "19:00", and tooltips, tables and screen readers say "Day 2, 7:15pm". Core exports `END_OF_NIGHT_HOUR` from `@oztix/roadie-core/datetime`, the 6am cutoff that both a late show's night and an `eventTime` day share.
