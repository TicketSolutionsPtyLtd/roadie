---
title: The first click on a leading image or embed selects nothing
date: 2026-10-16
category: component-patterns
module: editor
tags: [prosemirror, tiptap, node-selection, focus, iframe, vitest, browser-mode]
problem_type: bug
---

## Symptom

In an editor whose document starts with an image or embed, the first click on
that node, when it also focuses the page, selects nothing: no ring, no node
toolbar, and the caret lands in the first text instead. It happens when the
page isn't focused yet, such as an editor in an iframe, or after the person
was in the address bar or another app. Vitest's browser tests hit it on the
first test of a file, because each file's frame starts unfocused. A later click
works, and a click on a node that isn't first works.

## Root cause

A new ProseMirror state starts at `Selection.atStart(doc)`, which is a
`NodeSelection` when the document starts with a selectable atom. ProseMirror
draws its selection into the DOM only while focused, so that one is never
drawn. On the click, `selectClickedLeaf` asks for the same `NodeSelection`,
and `updateSelection` returns early because it equals the state's, so nothing
dispatches and nothing draws it. Meanwhile the page taking focus puts the
browser's own caret at the start of the text, and the `selectionchange` that
follows reads that caret back into the state as a `TextSelection`.

A focused page doesn't hit it: the press focuses the editor first, and
ProseMirror's focus handler draws the selection before the click resolves.

## Fix

`EditorEngine` handles `mousedown` in `handleDOMEvents`: when the editor isn't
focused and its state holds a `NodeSelection`, it calls `view.focus()`, which
draws the selection, so the click then resolves against what's on screen. It's
limited to a `NodeSelection`; focusing on every unfocused press raced
ProseMirror's focus-time selection sync and lost arrow keys typed straight
after a click.

To test it, start from outside the page, as the node toolbar tests do:

```ts
getSelection()?.removeAllRanges()
window.parent.focus()
```

Don't click the page first to "focus the frame"; that hides this bug.
