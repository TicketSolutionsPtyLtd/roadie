---
'@oztix/roadie-charts': minor
'@oztix/roadie-core': minor
---

Add `comparison` to `LineChart` and the dashboard `line` plot, so a single series can show last period as context. Pass `comparison: { y, label? }`, a field on the same rows, and the chart draws it as a quiet line behind the series, named in the tooltip, the end label, the legend, the Table view, and the words read out for each day. A cumulative line adds it up too. With `series` set the chart leaves it out, and `validateDashboard` warns.
