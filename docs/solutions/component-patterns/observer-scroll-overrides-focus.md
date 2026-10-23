---
title: A resize scrolled a ToggleGroup away from the focused item
date: 2026-10-23
category: component-patterns
module: components
tags: [toggle-group, resize-observer, scroll, focus, keyboard, firefox, flaky]
problem_type: bug
---

## Symptom

The ToggleGroup test "an edge fade › scrolls to the end Home or End moves
focus to, clear of the fade" failed about one run in five in Firefox, only
for the single-select group: `expected 0 to be greater than or equal to 172`.
`End` moved focus to `Year`, but the track stayed at the start.

## Cause

`End` focused `Year` and the group's focus handler scrolled it clear of the
fade. Then the group's `ResizeObserver` in `followPressedItem` delivered its
first callback, which scrolls the pressed item into view, and scrolled the
track back to `Day`. In Firefox that first callback could land after the
keypress. A multiple group has no pill, so no observer, and never failed.

Users hit it too: resize the window while focus sits on an item other than
the pressed one, and the focused item scrolls out of view.

## Fix

`followPressedItem` reveals the focused item, and the pressed one only when
focus is outside the group. It reads `activeElement`, not `:focus`,
which stops matching while the window is blurred.

"keeps the item focus is on in view as the group resizes" in
`ToggleGroup.browser.test.tsx` resizes the group after `End` and fails in
every engine without the fix. It waits for a `ResizeObserver` of its own,
made after the component's, since observers run in creation order.

An observer that scrolls should check where focus is before it scrolls to
where the state is.
