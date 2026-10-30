---
title: A click on a row checkbox slips onto its label while the pane header animates
date: 2026-10-31
category: test-failures
module: components
tags:
  [
    vitest,
    browser-mode,
    firefox,
    playwright,
    base-ui,
    checkbox,
    record-table,
    pane,
    transitions,
    flaky
  ]
problem_type: test_failure
---

## Symptom

`RecordTable.totals.browser.test.tsx` "lines up with the columns when scrolled
sideways, and under the bulk bar (pane)" failed in CI's Firefox job with
`expected null not to be null` at the poll for the Bulk actions toolbar, on
all three attempts, on a PR that didn't touch RecordTable (roadie#757). It
passed 9 of 9 alone on a quiet machine, and failed about one run in six with
ten CPU burners alongside. The failure screenshot showed the pane scrolled
back to the top, "Ocean Alley 1" hovered and unselected.

## Cause

The test scrolls the pane down, then clicks the first row's checkbox.
Playwright scrolls the row back into view, which starts the pane header's
expanding transition (`grid-template-rows` over `duration-slow`), and clicks
straight after: it checks the element is stable _before_ scrolling, not after.
Logging the real events showed `mousedown` on the checkbox's box and, 16ms
later at the same viewport point, `mouseup` on the `<label>` around it, the
header 3px taller. The `click` then fired on the label.

Roadie's `Checkbox` wraps Base UI's root in a `<label>`. A click on the label
reaches only Base UI's hidden `<input>`, whose change fires `onCheckedChange`.
`RecordsRowCheckbox` toggled from the root's `onClick` instead, so the label
(with `px-1.5 py-1` of hover-tinted padding around the box) was a dead zone:
the click toggled nothing, and the row's own click handler skipped it as a
control. A user whose press slips off the box, or who clicks the padding, hit
the same gap.

## Fix

`RecordsRowCheckbox` toggles from `onCheckedChange`, the path every click
reaches, and reads Shift from the real mouse and key events on a wrapper
around the `Checkbox`, since the input's change carries no modifiers. A
click on the label itself is forwarded to the box, because Firefox skips a
label's activation while Shift is held, so a Shift click on the padding
would otherwise select nothing there. The unit test "selects from a click on
the padding around the box, and a range with shift" clicks the label
directly, and the browser test "selects a range from a Shift click on the
padding around a box" does so in Chromium, WebKit, and Firefox.

## Prevention

- A Roadie `Checkbox` toggles through `onCheckedChange`. Don't hang the
  toggle on the root's `onClick`, or the label becomes a dead zone.
- Firefox doesn't activate a label's control from a click with Shift held.
  A control that gives Shift a meaning has to forward the label's click
  itself, and its test for that has to run in Firefox.
- Playwright's auto-scroll before a click can start a transition in the page
  (a collapsing pane header, a sticky toolbar) and clicks before it settles.
  When a test must click during such motion, the component has to survive a
  press and release landing on different elements, so test that directly
  rather than waiting the motion out.
- To find where a flaky click really landed, add capturing `mousedown`,
  `mouseup` and `click` listeners that log the target and the moving
  element's size, and run with `DEBUG=pw:api` for Playwright's own steps.
