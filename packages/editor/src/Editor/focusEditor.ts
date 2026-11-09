import { useRef } from 'react'

import type { Editor } from '@tiptap/react'

/**
 * Focuses the editor at its selection, at once. Tiptap's focus command waits
 * a frame, and in Safari first focuses the DOM, which moves the caret to the
 * start of the editor before ProseMirror can restore the selection.
 */
export function focusEditor(editor: Editor) {
  editor.view.focus()
}

/**
 * A menu's `finalFocus`: back to the editor at once, as Firefox drops a caret
 * move made before a deferred focus lands. It runs after the exit animation,
 * so it leaves focus that has moved on, as to the next menu opened.
 */
export function useEditorFinalFocus(editor: Editor | null) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const finalFocus = () => {
    const active = document.activeElement
    const movedOn =
      active !== null &&
      active !== document.body &&
      ![triggerRef.current, popupRef.current, editor?.view.dom].some((own) =>
        own?.contains(active)
      )
    if (editor && !movedOn) focusEditor(editor)
    return false
  }
  return { triggerRef, popupRef, finalFocus }
}
