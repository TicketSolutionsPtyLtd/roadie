---
'@oztix/roadie-charts': minor
---

Add `donutChart` to `@oztix/roadie-charts/static`, so `renderChartSvg(donutChart, props, options)` draws a donut without React, `renderChartDocument` draws a chart document's `donut` plot, and `donutChartTable` joins `/tables`. A donut takes the `donut` plot's props. Parts run largest first from 12 o'clock, and past five, the four largest stay and the rest roll into Other. Each slice shows its share as a whole percent outside the ring, on a leader line, and the percents add up to 100. A slice under 3% goes unlabelled. The total sits in the centre when it fits, and the legend gives each part's value and share.
