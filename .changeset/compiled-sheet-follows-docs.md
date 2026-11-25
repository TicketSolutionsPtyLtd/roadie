---
'@oztix/roadie-core': minor
---

Breaking: remove 140 classes from `@oztix/roadie-core/css/compiled` that neither the docs nor any Roadie package names. The compiled sheet now holds Roadie's `cn()` family utilities (intent, emphasis, semantic colour, text style, motion, and layering) plus each class the docs name or a package uses. Apps that build with Tailwind and import `@oztix/roadie-core/css` are unaffected: they get any of these classes by writing them.

A host that links the compiled sheet and writes one of these classes loses its styles. Add the class to your own sources, or write the rule in your own CSS:

- Chart colours, 133 in all: every `text-chart-*` except `text-chart-status-critical`, `text-chart-status-good`, and `text-chart-status-warning`; `bg-chart-7`, `bg-chart-8`, `bg-chart-axis`, `bg-chart-band`, `bg-chart-diverge-0`, `bg-chart-diverge-neg-1`, `bg-chart-diverge-pos-1`, `bg-chart-gap`, `bg-chart-grid`, `bg-chart-label`, `bg-chart-median`, `bg-chart-missing`, `bg-chart-pair-1`, and `bg-chart-pair-2`; every `fill-chart-*` except `fill-chart-1` to `fill-chart-3`, `fill-chart-band`, `fill-chart-highlight`, and `fill-chart-trio-1` to `fill-chart-trio-3`; and every `stroke-chart-*` except `stroke-chart-1` to `stroke-chart-4`, `stroke-chart-axis`, `stroke-chart-context`, `stroke-chart-highlight`, and `stroke-chart-median`.
- Scale colours: `fill-brand-5`, `fill-brand-9`, `fill-info-5`, `fill-neutral-0`, `fill-neutral-12`, and `stroke-neutral-12`.
- `divide-normal`.

`fill-brand-secondary-5` leaves the safelist too; it never compiled to a rule. No theme variable or keyframe leaves the sheet, so the `--chart-*` tokens are all still there. The sheet is 6.8 kB smaller (153.1 kB, 16.6 kB with brotli).
