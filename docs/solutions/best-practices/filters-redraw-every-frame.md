---
title: A filtered element is redrawn on every frame it moves
date: 2026-11-24
category: best-practices
module: components
tags: [css, filter, drop-shadow, performance, chromium, carousel, card]
problem_type: best_practice
---

## Problem

A carousel of `Card variant='ticket'` swiped at about 20fps, even on a fast
Mac, and a long list of them scrolled with dropped frames. Removing the
card's `filter`, or giving each card its own layer with
`will-change: transform`, brought both back to 60fps.

## Cause

The ticket drew its edge and shadow as seven stacked `drop-shadow()`
filters on the root, so they followed the notches cut into its sides. A
`filter` isn't cached with the content it filters: when the element moves
inside a layer that is redrawn (a carousel track sliding, a list scrolling
past new tiles), the browser repaints the element and runs every filter
again, each a separate blur over the element's whole area. Seven filters on
a dozen cards cost more than a frame.

Layer promotion hides the cost but moves it: each promoted card is a
texture the compositor holds and blends. A prototype found that promoting
list cards made scrolling slower, so it only promoted carousel cards.

## Rule

Draw shadows and outlines with `box-shadow`, whose blur browsers draw once
for the box and reuse, and draw any shape a box-shadow can't follow into the
element's own background. Keep `filter` for things that don't move, or that
are small.

For the ticket that meant:

- The edge and the three shadows are one `box-shadow` on the root, which
  follows its rounded corners.
- The notches are holes in the parts (a scoop corner, or a mask where
  `corner-shape` isn't supported), one pixel smaller than before, and each
  notched part paints the edge in that last pixel as a `radial-gradient`
  ring in its background.
- Where the drop-shadows piled up in the notch, they gave it a darker line
  than the outer edge. Raised tickets keep that with a `--card-rim` colour,
  darker than `--card-edge`.

The only thing lost is the faint shadow the filters cast into the notch
itself.

## Guard

`CardTicket.perf.browser.test.tsx` slides a carousel of tickets and scrolls
a list of 40 on the frame harness. Before the change, the carousel's p95
frame was 83ms with 56% of frames dropped, and the list's 50ms with 16%
dropped; after, both are 16.8ms with none dropped. It runs only with
`--perf`, so `CardTicket.browser.test.tsx` also checks that the ticket has
no `filter` and still draws its edge around the notch, in every engine.
