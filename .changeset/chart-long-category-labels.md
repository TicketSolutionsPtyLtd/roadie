---
'@oztix/roadie-charts': patch
---

Keep long category names inside the card on `RankedBars`, horizontal
`StackedBars` and `Funnel`. The name column takes what the longest name needs,
up to 40% of the plot (at least 72px, at most 240px). A longer name wraps to
two lines, or one when rows are too tight for two, then ends in an ellipsis.
Each label carries its full name in a `<title>`, live and in `renderChartSvg`,
and the table and summary keep it whole. `renderSmallMultiplesSvg` cuts a
caption that would run into the next panel the same way.
