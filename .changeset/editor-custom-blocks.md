---
'@oztix/roadie-editor': minor
---

Add `@oztix/roadie-editor/extensions` and `Editor`'s `extensions` prop, so an app adds its own blocks to the `blocks` preset without installing Tiptap. The prop, `EditorBlock`, `EditorNodeViewProps`, `reactNodeView`, and the Tiptap re-exports are experimental: they expose Tiptap's types, so they may change in a minor release. Prefer an `EditorSection`, in `sections`, for any block that doesn't need an interactive view.

The subpath re-exports Tiptap's `Node` and `mergeAttributes`, plus `NodeViewWrapper` and `reactNodeView` for a block edited through a React view. Each `{ node, label, icon, keywords }` in `extensions` shows in the `/` insert menu and saves only its attrs. `renderEditorValue` takes a `nodeMapping` entry per block and drops a block with none; `renderEditorHtml` drops them all. `migrate` takes `customBlocks` to keep them in a stored value.
