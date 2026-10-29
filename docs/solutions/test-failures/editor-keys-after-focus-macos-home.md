---
title: Editor tests that select with Home and Shift+Arrow fail on macOS and flake in CI
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
Linux WebKit also retried these tests often, along with others that click
and then press native caret keys.

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
  writes ProseMirror's selection back. Firefox, and WebKit on Linux, can
  deliver `selectionchange` late, so Shift+Arrow moves that land within
  those 20ms can still be unread, and the timer undoes them. A logged timer moved the selection
  from `0/3` to `0/2`, the "Sol" seen in CI. No user presses a key 10ms
  after clicking, so it's a test bug, not a product bug.

## Fix

`packages/editor/src/Editor/testUtils.ts` (kept out of `dist` by
`tsdown.config.ts`) holds:

- `LINE_START` and `LINE_END`: Cmd+Left and Cmd+Right on macOS, Home and
  End elsewhere. Use them for every line move in an editor test.
- `selectParagraph`: a triple click. ProseMirror's mousedown handler
  selects the paragraph itself (`defaultTripleClick`), so its state, the
  DOM and its last-read selection change together, and the focus timer has
  nothing to undo. The link tests select "Sold out" this way instead of
  building the selection from native Shift+Arrow moves. "links the
  selection to a typed address" uses it on the first of two paragraphs, so
  a link on more than the selection fails.
- `clickIntoEditor`: a click that resolves once the focus sync has run,
  for a test that places a caret with native keys, such as
  `{End}{ArrowLeft}` or `LINE_START`, right after the click that focuses
  the editor (INNO-1429). Waiting for a state the click sets, such as a
  toolbar button's `aria-pressed`, doesn't help, since the timer is still
  pending then. The helper adds a focus listener before the click, which
  runs after ProseMirror's own, and sets a timer of the same 20ms there.
  Timers of equal delay run in the order they're set, so it fires only
  after the sync. It waits on that event, not a guessed time. It resolves
  at once if the editor already has focus, since the sync ran when it took
  focus, so don't call it within 20ms of a `focus()` call.
  `focusedTextbox` in `Editor.browser.test.tsx` uses it.

Linux WebKit has a separate flake in these files. In CI's image, about one
run of `EditorPopoverForm.browser.test.tsx` in five fails a Link test
because the popover's close never finishes, on `main` as well. It looks like
the frame stall in
[linux-webkit-no-frames-while-idle](linux-webkit-no-frames-while-idle.md),
not this race; INNO-1491 tracks it.

## Check

A new editor test that presses caret keys after a click uses
`clickIntoEditor` or `selectParagraph`, never a bare `userEvent.click`.

Run the editor browser tests on macOS with
`pnpm test:gated editor --all --all-browsers`. A Mac run catches the Home
and End bindings, which Linux CI can't. To see the race, click into the
editor, spin until about 10ms after its `focus` event, then press the Shift+Arrow
keys. In Firefox, one in a few dozen tries drops a move.
