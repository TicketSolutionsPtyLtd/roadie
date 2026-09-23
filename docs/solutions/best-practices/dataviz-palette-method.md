---
title: How the chart palette was built, and what not to undo
date: 2026-09-24
category: best-practices
problem_type: design_decision
components:
  - core
  - dataviz
keywords:
  - dataviz
  - chart colours
  - oklch
  - colour-blind
  - palette
severity: medium
related_files:
  - packages/core/src/dataviz/palette.ts
  - packages/core/src/dataviz/validate.ts
  - packages/core/src/css/dataviz.css
---

# How the chart palette was built

The palette lives in `packages/core/src/dataviz/palette.ts`. CI validates it in
`validate.ts`. These are the decisions a future edit should not undo.

## Not derived from the intents

A palette built from brand, success, warning, danger and info hues could not
get past a colour-blind ΔE of 6.4. Its red and amber series also read as
status. The chart hues sit between the intent hues instead.

## Ambers and yellows stay light

Amber holds its chroma only at high lightness. Pulled down to L 0.63 for
contrast on white, it turned mustard (`#b97e00`). Slot 4 sits at L 0.82 in
light mode and relies on gaps, direct labels and the table view rather than
3:1 contrast.

## Diverging arms start from grey

Each arm interpolates from the grey midpoint to its own hue. Interpolating
between the two poles through a blue-tinted grey put pink in the warm arm. In
dark mode the warm arm starts coral, because amber at low lightness reads
brown.

## Soft, not bold

The first tuned palette read as too intense. Chroma dropped by about 15% and
lightness rose, and dark mode lightness was re-optimised to keep every
colour-blind score at 8 or above.

## Slot 7 keeps its distance from danger

Slot 7 is crimson-rose at hue 6 in light mode. At the softer level it drifted
to ΔE 8.5 from the danger status colour. The validator now requires 12.

## Changing a value

Edit `palette.ts`, run `pnpm --filter @oztix/roadie-core test -u` to regenerate
`dataviz.css`, and read the validator's failures. Each one names the check,
the mode, the slots and the score. Nudge lightness before hue, and never lower
a target to make a palette pass.
