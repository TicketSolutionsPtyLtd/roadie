---
'@oztix/roadie-charts': patch
---

Keep long category names inside the card on `RankedBars`, horizontal
`StackedBars` and `Funnel`. The name column takes what the longest name needs,
up to 40% of the chart's width (never capped below 72px or above 240px, which
replaces RankedBars' old 180px cap). A longer name wraps to two lines, or one
when rows are too tight for two, then ends in an ellipsis. On rows too tight for
one line, names are thinned so none overlap, as the old axis did. Widths are
estimated wider for capitals, M, W and CJK. Each label carries its full name in
a `<title>`, live and in `renderChartSvg`, and the table and summary keep it
whole. Names now draw at the full label colour rather than the axis's muted one,
and RankedBars and Funnel bars use the height the axis used to reserve.
`renderSmallMultiplesSvg` cuts a caption that would run into the next panel the
same way.

Field names now split a one-letter word out of a capital run, so `ticketsADay`
heads tooltips and tables as "Tickets a day" rather than "Tickets aday".
Acronyms of two or more capitals keep their case, plural or not: `grossAUD`
reads "Gross AUD" and `topURLs` reads "Top URLs".
