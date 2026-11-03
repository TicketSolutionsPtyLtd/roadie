---
'@oztix/roadie-charts': minor
'@oztix/roadie-core': minor
---

Add `comparison` to `BarChart` and the dashboard `bar` plot, so daily bars can show last period. Pass `comparison: { y, label? }`, a field on the same rows, and the chart draws it as a quiet bar to the left of each bar, both from zero, and textured apart from the bars in print and under forced colours. A legend names the two bars when there's a comparison value, and the tooltip, the Table view, and the words read out for each bar show the value. Rows that share an x add it up, like the bars. A comparison with no values, or one naming the chart's own `x` or `y`, is left out everywhere, and `validateDashboard` warns on the second.
