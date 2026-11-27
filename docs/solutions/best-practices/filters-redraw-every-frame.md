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

- The shadow is a `box-shadow` on the root, which follows its rounded
  corners (on a split ticket, on casters; see below).
- The edge can't be on the root: a root ring runs straight across the mouth
  of each notch, because only the parts know where the join is. So each part
  draws its outer sides as `inset` box-shadows, with its outer corners taking
  the card's radius (`border-*-radius: inherit`), so the edge follows them.
  The edge is mixed solid with the fill, since the parts draw it inside
  their own boxes, over the fill.
- The notches are holes in the parts (a scoop corner, or a mask where
  `corner-shape` isn't supported), smaller by the edge's width (one pixel on
  raised and normal, none on subtle and subtler), and each notched part
  paints the edge in that ring as a `radial-gradient` in its background.
- A shadow on the root runs straight across a notch's mouth, which shows
  under the bottom notch of a horizontal ticket as a line across the cut.
  So a split ticket (horizontal, or auto once it splits) casts its shadow
  from its `::before` and `::after` instead: one per grid column, behind
  the parts, each with the card's radius, so the shadow thins out toward
  the join. The root stops clipping so they show, and each part clips its
  own content. Stacked on auto, the second column is empty, so its caster
  has no area and the first covers the card. They're placed by grid
  column, not by a container query: Firefox can miss a container query on
  a pseudo-element of the container itself until the card is resized.
  A stacked ticket keeps the root's shadow: its notches are on the sides,
  where the shadow is only a faint blur. Without the root's clip, a
  `Card.Link` overlay is rounded to the card's radius, so its square corners
  don't take clicks.

What's lost: the faint shadow the filters cast into each notch, and on a
stacked raised ticket the faint blur of the root's shadow at each side
notch's mouth. A raised ticket's outline is also darker: the filters drew it
lighter along the sides than around the notch, where they piled up, and the
parts draw it at the notch's 20% all the way round, as does the ring on a
ticket with no footer.

## Guard

`CardTicket.perf.browser.test.tsx` slides a carousel of tickets and scrolls
a list of 40 on the frame harness. Before the change, the carousel's p95
frame was 83ms with 56% of frames dropped, and the list's 50ms with 16%
dropped; after, both are 16.7ms with none dropped. Keeping only the four zero-blur
edge filters measured a 366ms first frame and 27% of frames dropped. The
perf test runs only with `--perf`, so `CardTicket.browser.test.tsx` also
checks, in every engine, that the ticket has no `filter`, draws its edge
along every outer side and corner and around the notch, leaves each notch's
mouth open, draws the same edge with no footer, and that a ticket nested in
a notched part takes none of its notches. For a split ticket it checks that
no shadow falls under the bottom notch, light and dark, that the shadow
follows the card's state, that a stacked auto ticket casts the vertical
one's shadow, and that a link takes no clicks outside the corners.
