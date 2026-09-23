---
'@oztix/roadie-core': minor
---

Add data visualisation colours. Charts get `--chart-1` to `--chart-8` for
series, `--chart-heat-*` for amounts, `--chart-diverge-*` for ahead of or
behind a benchmark, `--chart-status-*` for meaning, and `--chart-highlight`,
which follows `--accent-hue`. Each comes with `bg-`, `fill-`, `stroke-` and
`text-chart-*` utilities, in light and dark. Canvas, SVG and PDF renderers can
read the same values as hex from `@oztix/roadie-core/dataviz`, and
`chartColorVar(i)` gives a CSS variable when the slot is dynamic. The palette
is checked for colour-blind separation in CI.
