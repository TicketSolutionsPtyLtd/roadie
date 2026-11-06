'use client'

import { type ComponentType, createElement } from 'react'

import type { Icon } from '@phosphor-icons/react'
import { Node } from '@tiptap/core'
import { type ReactNodeViewProps, ReactNodeViewRenderer } from '@tiptap/react'

// Roadie's own Tiptap, so an app's blocks never install or drift from it.
export { mergeAttributes } from '@tiptap/core'
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

/** One choice in a `choice` setting. */
export type EditorSettingOption = { value: string; label: string }

/**
 * One of a block's settings, which its Settings drawer edits as one field.
 * `name` is the attr it sets.
 */
export type EditorSetting = {
  name: string
  label: string
  helperText?: string
} & (
  | {
      /** A line of text, or a few with `multiline`. */
      type: 'text'
      multiline?: boolean
    }
  | {
      /** One of its options, as buttons up to three, or a select past that. */
      type: 'choice'
      options: readonly EditorSettingOption[]
      /** The option shown chosen while the attr is unset, as the block draws it. */
      defaultValue?: string
    }
  | {
      /**
       * An image, `{ src, alt }`: a link, or an upload with the editor's
       * `onUploadImage`, and its alt text.
       */
      type: 'image'
    }
  | {
      /** A link with its label, `{ label, href }`, such as a button. */
      type: 'action'
    }
  | {
      /**
       * A list the author adds to, removes from and reorders, each item edited
       * in its own fold: an object of `fields`, or an `item` that's an image
       * or an action.
       */
      type: 'list'
      /** What one is called, as in "Add card". */
      itemLabel: string
      fields?: readonly EditorSetting[]
      item?: 'image' | 'action'
      /** The most it takes. */
      max?: number
    }
)

/** An app's own block, for the `blocks` editor's `extensions`. */
export type EditorBlock = {
  /**
   * A block atom (`group: 'block'`, `atom: true`). Its attrs are what it
   * saves, so keep them to its inputs, never rendered content.
   */
  node: Node
  /** Its name in the insert menu. */
  label: string
  /** A bold Phosphor icon for the insert menu. */
  icon: Icon
  /** Other words the insert menu finds it by. */
  keywords?: readonly string[]
  /**
   * The insert menu heading it's listed under: one of the preset's, such as
   * Media, or its own.
   * @default 'More'
   */
  group?: string
  /**
   * What its Settings drawer edits, one field each, so its view can render
   * it as the page will rather than as a form. The block menu leads with
   * Settings, and Enter opens it on the selected block.
   */
  settings?: readonly EditorSetting[]
}
