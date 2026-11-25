---
title: An inset box-shadow on a scroller costs every frame without a GPU
date: 2026-11-26
category: best-practices
module: components
tags:
  [
    css,
    box-shadow,
    rim-light,
    scroll,
    compositing,
    performance,
    chromium,
    combobox,
    select,
    autocomplete,
    perf
  ]
problem_type: best_practice
---

## Symptom

After #1033 gave the list popups Menu's `emphasis-floating` recipe, the Perf
workflow's "Combobox, typing over 2,000 items, virtualized" failed about one
run in eight: p95 33.3ms with 4 frames dropped and no long tasks. Nothing on
the main thread was slower. Style recalc for the whole typing run was 3 to
8ms before and after.

## Cause

`emphasis-floating` draws its rim light as two inset box-shadows. The list
popups are also their own scroll container. Chromium can paint a scroller's
plain background colour into its scrolling layer, so the rows sit on an
opaque layer, but not when the scroller has an inset shadow: the fill then
goes on the layer behind, and the scrolling layer is transparent. With no
GPU (CI's runners, and the Perf tests' `--disable-gpu` locally) the software
compositor blends every row of that layer over the fill on every frame the
list changes. A dropped frame with no long task is the sign: the main thread
was idle, the compositor wasn't.

Measured, in a Chromium trace of the typing run (`Display::DrawAndSwap`,
software compositing): about 57ms with the inset rim, 40ms without it, and
39ms with the rim kept but the popup not scrolling. In CI, over 96 runs on
12 runners per commit, the virtualized typing dropped 1.38 frames a run and
missed its budget in 12.5% of runs with the inset rim, against 0.33 to 0.44
and 1% on the commits before #1033 and on #1033 with only the rim removed.

Ruled out: #1042 (the shared emphasis state rule) and #1062 (component
sheets in `@layer components`), whose commits measured the same as the
commit before them; `shadow-xl` against `shadow-lg`; and moving the scroll
to the List, whose transparent scrolling layer costs the same. An outline,
`background-clip`, `contain: paint`, and `will-change: scroll-position`
didn't help either.

## Fix

The list popups keep Menu's recipe but clear the inset rim through
`--rim-light-own` and draw it as a 1px border the fill shows through
(`scrollingPopupRimClass` in `packages/components/src/variants.ts`). A pixel
of padding moves to the border, so rows stay where they were.
`floatingPopups.browser.test.tsx` fails if a list popup has an inset shadow
again.

Give a scroller whose content changes every frame (a filtered or virtualized
list) a border, not an inset shadow, for its edge. Menu still scrolls with
the inset rim; its frame tests don't type into it, and its blur is accepted
by design (INNO-1522).
