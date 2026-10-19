---
title: Editor state read during render goes stale under the React Compiler
date: 2026-10-16
category: component-patterns
module: editor
tags: [react-compiler, tiptap, use-editor-state, memoisation, selection]
problem_type: bug
---

## Rule

Read Tiptap editor state in render only through `useEditorState`. Never
derive it from `editor` alone: not `editor.state`, the selection,
`isActive`, `getAttributes`, `can()`, or `isEditable`.

## Symptom

With text first in the document, the embed toolbar's Edit link opened
empty. With an embed first, the main toolbar's Embed opened holding that
embed's link (INNO-1300). Separately, turning an editor `disabled` or
`readOnly` after it mounted left its toolbar enabled.

## Cause

`@oztix/roadie-editor` builds and tests with the React Compiler
(`react-compiler.config.ts`). The compiler caches a call in render by its
inputs, and Tiptap's `editor` is one mutable object that keeps its identity
for its life. `selectedEmbed(editor)` in `EditorEmbedPopover`'s render was
cached on `editor`, so every later render reused the first selection.

`useEditorState` re-runs its selector only when the editor emits a
`transaction` or `update`. `editor.setEditable(editable, false)` emits
neither, so a selector reading `isEditable` kept the old value.

## Fix

- Render that follows the editor: a `useEditorState` selector, as
  `EditorToolbarEngine` and `EditorNodeToolbar` do.
- A form that starts from the selection: read it once as it opens, in a
  `useState` initialiser (`EmbedForm`, `LinkForm`, `AltTextForm`) or in the
  event that opens it.
- A change that isn't a transaction, such as `setEditable`: dispatch an
  empty transaction after it (`addToHistory: false`) so subscribers re-read.
  `EditorEngine` does this.

Avoid `'use no memo'`: it hides the read from review and leaves it stale for
consumers who copy the pattern.

Tests: `EditorNodeToolbar.browser.test.tsx` ("fills Edit link for the clicked
…") and `Editor.browser.test.tsx` ("turns its controls off and on…").
