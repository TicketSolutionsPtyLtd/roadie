---
'@oztix/roadie-charts': minor
'@oztix/roadie-core': minor
---

Add `comparison` to `BarChart` and the dashboard `bar` plot, so daily bars can show last period. Pass `comparison: { y, label? }`, a field on the same rows, and the chart marks it with a quiet tick across each bar, so the bars still start at zero. A legend names the bars and the tick, and the tooltip, the Table view, and the words read out for each bar show the value. Rows that share an x add it up, like the bars.
