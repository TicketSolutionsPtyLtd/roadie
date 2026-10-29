---
'@oztix/roadie-charts': minor
---

Add `decimals` and `trimZeros` to every chart with a `format`, as `<LineChart format='percent' decimals={2} />` for `1.27%` sold. They set how values and shares read in the tooltip, value labels, Table view, and screen reader text: a ranked bar's share, a stacked chart's share mode, and a funnel's conversion. A bar chart's `line` takes its own, and `Chart` and dashboard cards pass them to the headline value and its delta. Axis ticks stay short, and values past 10,000 still go compact on the plot.
