---
title: Hiding a parked pane without restyling its content
date: 2026-11-25
category: pane-motion
module: components
tags:
  [
    css,
    pane,
    navigator,
    performance,
    style-recalc,
    content-visibility,
    container-queries,
    property,
    webkit,
    chromium
  ]
problem_type: best_practice
---

## Problem

A phone push or pop still restyles each moving pane's whole subtree
(INNO-1706). A parked pane changes three inherited values on its root:
`visibility` and `pointer-events`, which hide it, and `--pane-back`,
which moves the header's height, and `--pane-header-height` is inherited
and read deep in the content by Records' sticky offsets.
[An inherited value that changes restyles everything below it](../best-practices/inherited-property-change-restyles-subtree.md).

## What was measured

Style per phone push with 100 list rows, in the Pane frame test, locally at
about 3.3x CPU, over one to three runs each:

| Change                                                                                    | Style ms |
| ----------------------------------------------------------------------------------------- | -------- |
| None                                                                                      | 82 to 90 |
| `inert` on the parked pane instead of `visibility`                                        | 86 to 97 |
| No `pointer-events` flip                                                                  | 61 to 78 |
| No `pointer-events` flip, and a parked pane past the root keeps Back, so its header holds | 74       |
| All three held still, the content hidden with `content-visibility: hidden`                | 40 to 47 |

On eight CI runners at once, holding Back alone moved nothing measurable,
and dropping the `pointer-events` flip as well took the 100-row push to 81
to 95ms. The RecordTable scenario still cost 130 to 164ms, since most of
it is mounting the table itself, so its cap stays waived.

`inert` doesn't help: Chromium computes inertness in style and it inherits,
so toggling it restyles the subtree just as `visibility` does.

## Traps on the way to the bigger number

Each of these was tried and dropped. They're worth knowing before the next
attempt.

- **A discrete `content-visibility` transition.** `content-visibility:
  hidden` with `transition-behavior: allow-discrete` keeps a leaving pane
  drawn through its slide in Chromium and Firefox. WebKit flips it at the
  start, so the pane slides away blank.
- **A registered custom property, transitioned with `step-end`, as the
  "slide has ended" signal.** It works in every engine, but Chromium
  restyles the property's readers on every frame the transition runs, which
  cost more than it saved: empty panes went from about 30 to 48ms.
- **A style query on a pane's own value from its children.** When the
  pane's value came from a container query on its parent and a transition
  that `transition: none` cancelled, Chromium kept evaluating the child's
  query against the old value. The overflow pane opened empty. Querying a
  value the child inherits explicitly from its parent fixed that.
- **Explicit `inherit` of a non-inherited registered property, read with
  `var()`.** In WebKit, a child or `::before` that sets `--x: inherit` sees
  the new value in `getComputedStyle`, but properties that use `var(--x)`
  keep the old one. Back stayed drawn after a resize, and a tap cover on a
  parked pane never appeared.
- **A cover instead of `pointer-events`.** Without the `pointer-events`
  flip, a leaving pane takes taps for the length of its slide, so a quick
  second tap on a row fires it again. A `::before` cover switched on by a
  non-inherited value works in Chromium and Firefox and fails in WebKit, by
  the trap above. A pseudo-element can't read its originating element's
  parked state through a container query either: the query never matches.

## What shipped

A parked pane no longer flips `pointer-events`. `visibility`, which
transitions, still hides it once its slide ends. While it slides, Navigator
appends a real element to it, `[data-pane-tap-cover]`, which sits over the
content and takes the taps. WebKit draws it, unlike the `::before` cover,
since nothing about it hangs on an inherited value.

- **When to draw it.** In the insertion effect that finds the top pane: when
  the top changes during a push (the row has `data-pushing`), the old top is
  covered, and a pane that becomes top again is uncovered at once.
- **When to lift it.** On the pane's own `translate` `transitionend` or
  `transitioncancel`, or three frames on when no `transitionrun` came, as on
  a wide screen or with reduced motion.
- **Not `getAnimations()`.** Reading the slide that way forces a style pass
  in the frame after the push. With it, the RecordTable push missed its frame
  budget in 5 of 16 CI jobs. With transition events, it missed in none of 8.
- **Not a `data-slot`.** Many `:has()` arguments name `data-slot`, so
  inserting an element that carries one makes Chromium check their anchors.

On eight CI runners in the same hour, the 100-row push cost 86 to 102ms of
style (median 93), against 85 to 127ms (median 107) on `main`. The RecordTable
push still costs 151 to 205ms, mostly the mount, so its cap stays waived, as
does the 100-row pop, which still flips the returning pane's `visibility`.
`navigatorPushTaps.browser.test.tsx` proves the cover in all three engines.

## What's left

Holding Back on parked panes moved nothing measurable on its own. The pop
and the RecordTable push need the `visibility` flip gone too, which needs a
way to hide a pane that every engine draws through a slide.
