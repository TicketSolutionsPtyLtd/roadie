---
'@oztix/roadie-charts': minor
---

Add `DonutChart` (`@oztix/roadie-charts/donut-chart`), a chart for one whole in two to five parts, such as tickets by type. It takes `data`, `x`, `y`, `format`, `takeaway`, `total` and `highlight`, like the `donut` plot. Parts run largest first from 12 o'clock, and past five, the four largest stay and the rest roll into Other. Each slice shows its share as a whole percent outside the ring, on a leader line, and the percents add up to 100. A slice under 3% goes unlabelled. The total sits in the centre when it fits, the legend gives each part's value and share, and the Table view lists every part with a total row. The plot is one tab stop, and the arrow keys move around the ring. `renderChartSvg(donutChart, props, options)` from `/static` draws it without React, `renderChartDocument` draws a chart document's `donut` plot, and `donutChartTable` from `/tables` builds its table. `CategoryAxis` gains `'ring'`.
