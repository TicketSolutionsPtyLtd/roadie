---
'@oztix/roadie-editor': minor
---

Add `@oztix/roadie-editor/extensions` and `Editor`'s `extensions` prop, so an app adds its own blocks to the `blocks` preset without installing Tiptap.

The subpath re-exports Tiptap's `Node`, `Mark`, `Extension`, and `mergeAttributes`, plus `NodeViewWrapper` and `reactNodeView` for a block edited through a React view. Each `{ node, label, icon, keywords }` in `extensions` shows in the slash menu and saves only its attrs. `renderEditorValue` takes a `nodeMapping` entry per block and drops a block with none; `renderEditorHtml` drops them all. `migrate` takes `customBlocks` to keep them in a stored value.
