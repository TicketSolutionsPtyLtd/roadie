'use client'

import { type ComponentType, createElement } from 'react'

import type { Icon } from '@phosphor-icons/react'
import { Node } from '@tiptap/core'
import { type ReactNodeViewProps, ReactNodeViewRenderer } from '@tiptap/react'

// Roadie's own Tiptap, so an app's blocks never install or drift from it.
export { Extension, Mark, mergeAttributes } from '@tiptap/core'
export { Node }
export { NodeViewWrapper } from '@tiptap/react'

/** What an app block's React view gets: its node, `updateAttributes`, and `selected`. */
export type EditorNodeViewProps = ReactNodeViewProps

/**
 * Renders a node with a React component in the editor. Return it from the
 * node's `addNodeView`, and wrap the component's output in `NodeViewWrapper`.
 * A read-only or disabled editor ignores its `updateAttributes` and
 * `deleteNode`.
 */
export function reactNodeView(component: ComponentType<EditorNodeViewProps>) {
  // Tiptap runs a view's commands even when the editor isn't editable.
  function EditableOnly(props: EditorNodeViewProps) {
    const { editor, updateAttributes, deleteNode } = props
    return createElement(component, {
      ...props,
      updateAttributes: (attributes) => {
        if (editor.isEditable) updateAttributes(attributes)
      },
      deleteNode: () => {
        if (editor.isEditable) deleteNode()
      }
    })
  }
  return ReactNodeViewRenderer(EditableOnly)
}

/** An app's own block, for the `blocks` editor's `extensions`. */
export type EditorBlock = {
  /**
   * A block atom (`group: 'block'`, `atom: true`). Its attrs are what it
   * saves, so keep them to its inputs, never rendered content.
   */
  node: Node
  /** Its name in the slash menu. */
  label: string
  /** A bold Phosphor icon for the slash menu. */
  icon: Icon
  /** Other words the slash menu finds it by. */
  keywords?: readonly string[]
}
