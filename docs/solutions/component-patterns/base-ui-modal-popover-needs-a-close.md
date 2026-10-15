---
title: A Base UI popover traps focus only when it has a Close
date: 2026-10-16
category: component-patterns
module: components/Popover
tags: [base-ui, popover, focus, focus-guards, keyboard]
problem_type: bug
---

## Problem

Records.Search opens Custom dates in a popover anchored to a chip, with no
trigger. Tab past its last control focused Base UI's after guard
(`span[data-base-ui-focus-guard]`), then the page body, and the popover stayed
open. A non-modal popover sends Tab on to whatever follows its trigger, and
with no trigger there is nothing to send it to.

Setting `modal` alone didn't help. Base UI 1.8.0's `PopoverPopup` passes the
focus manager `modal !== false && hasClosePart`, so a popover with no
`Popover.Close` inside never traps focus, whatever `modal` says.

## Fix

Give a popover that must keep focus both `modal` and a `Popover.Close`. Use
`modal='trap-focus'` when the page should still scroll and take outside
presses; `true` also locks scroll and covers the page. Custom dates uses
`'trap-focus'` and now has a header with the field's name as `Popover.Title` and a Close
icon button, as its phone drawer has (INNO-1277). Tab then cycles inside it.

A popover with a trigger, such as Records.Options, doesn't need this: Tab
leaves it for the control after the trigger.

`RecordsSearch.browser.test.tsx` tabs through Custom dates and checks focus
stays in the dialog. Remove the Close and it fails.
