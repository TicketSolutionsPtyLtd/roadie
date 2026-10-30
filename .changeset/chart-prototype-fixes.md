---
'@oztix/roadie-charts': patch
---

Fix three chart gaps found on the prototype's insights dashboards. `StackedBars` keeps an ordered category whose values are all zero, such as an empty age band, as an empty slot instead of dropping it, and draws no legend for a single series. `Heatmap` takes its row and column order from the data, so empty cells at the start no longer reorder the axes, matching its Table view. An annotation outside a line or stacked area chart's data now warns once in development, instead of disappearing silently.
