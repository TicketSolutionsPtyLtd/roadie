---
title: Editor tests that select with Home and Shift+Arrow fail on macOS and flake in Firefox
date: 2026-10-22
category: test-failures
module: editor
tags:
  [
    prosemirror,
    tiptap,
    firefox,
    webkit,
    macos,
    keyboard,
    selection,
    focus,
    vitest,
    browser-mode,
    flaky
  ]
problem_type: test_failure
---

## Symptom

The Link popover tests in `EditorPopoverForm.browser.test.tsx` and three in
`Editor.browser.test.tsx` failed every run on macOS in Firefox and WebKit
(INNO-1394). The link was inserted as new text at the end of "Sold out",
and the Bold and Underline tests never saw the caret leave the formatted
text. Chromium passed.

In CI on Linux, `browser (firefox 3/3)` failed "saves without submitting a
form around the editor" on all three attempts in one run, with
`Unable to find role="link" and name "Sold"`. The link covered "Sol".

## Cause

Two causes, each with the same test step: click into the editor, then
`{Home}{Shift>}{ArrowRight}×4{/Shift}`.

- **macOS key bindings.** On macOS, Home and End don't move the caret in a
  contenteditable in Firefox or WebKit. Line start is Cmd+Left. Chromium
  still moves the caret on Home, though Playwright sends it as
  `scrollToBeginningOfDocument` (`macEditingCommands.ts`), so only Chromium
  passed. On Linux all three engines move the caret.
- **ProseMirror's focus sync.** When the editor takes focus,
  `handlers.focus` in prosemirror-view sets a 20ms timer. If the DOM
  selection then differs from the last one ProseMirror read, the timer
  writes ProseMirror's selection back. Firefox delivers `selectionchange`
  late, so Shift+Arrow moves that land within those 20ms can still be
  unread, and the timer undoes them. A logged timer moved the selection
  from `0/3` to `0/2`, the "Sol" seen in CI. No user presses a key 10ms
  after clicking, so it's a test bug, not a product bug.

## Fix

`packages/editor/src/Editor/testUtils.ts` (kept out of `dist` by
`tsdown.config.ts`) holds:

- `LINE_START` and `LINE_END`: Cmd+Left and Cmd+Right on macOS, Home and
  End elsewhere. Use them for every line move in an editor test.
- `selectAll`: Mod+A, which ProseMirror runs as a command in its keydown
  handler. Its state, the DOM and its last-read selection change together,
  so the focus timer has nothing to undo. The link tests select "Sold out"
  this way instead of building the selection from native Shift+Arrow moves.

Native caret moves right after a click still carry the race. Prefer a
ProseMirror command, or a step the test waits on, such as a toolbar
button's `aria-pressed`.

## Check

Run the editor browser tests on macOS with
`pnpm test:gated editor --all --all-browsers`. A Mac run catches the Home
and End bindings, which Linux CI can't. To see the race, click into the
editor, spin until about 10ms after its `focus` event, then press the Shift+Arrow
keys. In Firefox, one in a few dozen tries drops a move.
