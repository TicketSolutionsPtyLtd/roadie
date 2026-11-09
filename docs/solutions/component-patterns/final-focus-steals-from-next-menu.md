---
title: A closing menu's finalFocus steals focus from the menu opened after it
date: 2026-11-09
category: component-patterns
module: editor
tags:
  [
    base-ui,
    menu,
    focus,
    final-focus,
    tiptap,
    bubble-menu,
    toolbar,
    firefox,
    flaky
  ]
problem_type: bug
---

## Symptom

"sets the columns' layout and their order on a phone from their toolbar" in
`EditorEmailColumns.browser.test.tsx` failed in Firefox on unrelated CI runs,
on all three attempts, with `Unable to find role="menuitemradio" and name
"Right first"`, then `locator.click: Timeout` on the retries. It passed every
time on a Mac. The `ResizeObserver loop` error logged near it was unrelated.

The test picks a Layout from the columns toolbar, then opens Stack on phone
and picks Right first. A user who opens the second menu just as the first
closes sees the toolbar vanish and the open menu jump to the top-left corner
of the page.

## Cause

Base UI calls a popup's `finalFocus` when the popup unmounts, so after its
exit animation, not when it closes. Each toolbar menu's `finalFocus` focused
the editor, unconditionally. About 150ms after Layout closed, by which time
Stack on phone was open, Layout's `finalFocus` moved focus into the editor.
A focus log showed focus go straight back into the Stack menu. That blurred
the editor with focus outside the toolbar, so Tiptap's `BubbleMenu` hid the
node toolbar and took it out of the DOM, Stack's trigger with it. The open
menu, with no anchor, moved to the corner.

This happened on every run in all three engines. Only when the test's
click landed on Right first did it depend on timing. On a fast machine the
click won. Under CI's load, Playwright checked the item's position, the menu
moved, and the click landed on whatever was there, an outside press that
closed the menu.

Base UI's own return focus checks whether focus has moved elsewhere since the
popup opened and leaves it there if so. A `finalFocus` function replaces that
check.

## Fix

`useEditorFinalFocus` in `packages/editor/src/Editor/focusEditor.ts` gives a
toolbar menu its `finalFocus` and refs for its trigger and popup. It focuses
the editor only when focus is on the menu, in the editor, or nowhere
(`document.body`). `BlockMenu`, `MoreMenu`, `EditorBlockMenuGroup`, and the
bubble toolbar's `OverflowMenu` use it.

Tab out of one of these menus now leaves focus on the next control, as Base
UI does by default, where it used to send focus to the editor.

The test now waits for the Layout menu to leave the DOM with Stack open,
then checks Stack's trigger is still there. Without the fix, that fails every
run in Chromium, Firefox, and WebKit.

## Check

A popup that hands focus back from `finalFocus` should first check focus
hasn't moved on, as Base UI does. The editor's other popovers and drawers
still hand it back unconditionally; they don't open from a toolbar beside
another menu, so they haven't hit this. To test a hand-back, wait for the
first popup to unmount, not just close, before checking the next.
