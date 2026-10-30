---
'@oztix/roadie-core': minor
---

Add `alignComparison` to `@oztix/roadie-core/dashboard`. It takes this period's rows, the comparison's rows, and the dashboard period, and returns this period's rows with the comparison's value under a field you name, lined up day by day from each range's start through `resolveComparison`. A month lines up with a shorter one, the previous year keeps its dates or, with `alignWeekday`, its weekdays, hourly rows match the same time of day, `series` lines each series up with its own, and a day the comparison doesn't cover, or one before `dataStart`, gets `null`.
