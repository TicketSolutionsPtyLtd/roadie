---
'@oztix/roadie-core': patch
---

The token manifest gives the chart ink tokens (`--chart-grid`, `--chart-axis`, `--chart-label`, `--chart-value`, and `--chart-gap`) a light value as well as a dark one, and lists `--chart-highlight`'s `oklch()` value in light mode, with the hex as its fallback. A rule on a selector list such as `:root, .dark` now counts for both modes.
