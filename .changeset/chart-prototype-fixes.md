---
'@oztix/roadie-charts': patch
---

Fix three chart gaps found on the prototype's insights dashboards. `StackedBars` keeps an ordered category whose values are all zero or missing, such as an empty age band, as an empty slot and an empty Table row instead of dropping it, says "in every band with sales" rather than "in every band" when a band is empty, and draws no legend for a single series. `Heatmap` takes its row and column order from the data, so empty cells at the start no longer reorder the axes, and a row or column with no values draws as an empty band, matching its Table view. An annotation outside a line or stacked area chart's data now warns once in development, in the same words as `validateDashboard`, instead of disappearing silently.
