---
'@oztix/roadie-core': minor
---

Add `alignComparison` to `@oztix/roadie-core/dashboard`. It takes this period's rows, the comparison's rows, and the dashboard period, and returns this period's rows with the comparison's value under a field you name, at the same time of day. The previous period of a month, quarter, or year keeps the day of the month, so 1 March meets 1 December, and a day the earlier month lacks, such as 31 October against September, gets `null`. The previous year keeps its dates or, with `alignWeekday`, its weekdays. Weeks, days, rolling ranges, and fixed dates line up day by day from each range's start. `series` lines each series up with its own, and a day the comparison doesn't cover, or one before `dataStart`, gets `null`. Where comparison rows repeat a day and series, the first one counts. A period with times, such as the past 6 hours, gives every row `null` and warns in development.
