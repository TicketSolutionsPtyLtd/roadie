import type { Editor } from '@tiptap/react'

/**
 * Focuses the editor at its selection, at once. Tiptap's focus command waits
 * a frame, and in Safari first focuses the DOM, which moves the caret to the
 * start of the editor before ProseMirror can restore the selection.
 */
export function focusEditor(editor: Editor) {
  editor.view.focus()
}
