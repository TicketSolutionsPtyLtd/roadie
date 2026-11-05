import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

type EmptyLineHintOptions = { hint: () => string | undefined }

/**
 * Marks the caret's empty paragraph with `data-hint`, which editor.css shows
 * while the editor has focus. An empty document is Placeholder's to mark.
 */
export const EmptyLineHint = Extension.create<EmptyLineHintOptions>({
  name: 'emptyLineHint',

  addOptions() {
    return { hint: () => undefined }
  },

  addProseMirrorPlugins() {
    const { editor } = this
    const { hint } = this.options
    return [
      new Plugin({
        props: {
          decorations: ({ doc, selection }) => {
            const text = hint()
            const { $from, empty } = selection
            const line = $from.parent
            const emptyDoc = doc.childCount === 1 && doc.firstChild === line
            if (
              !text ||
              !empty ||
              !editor.isEditable ||
              emptyDoc ||
              line.type.name !== 'paragraph' ||
              line.content.size > 0
            ) {
              return null
            }
            return DecorationSet.create(doc, [
              Decoration.node($from.before(), $from.after(), {
                'data-hint': text
              })
            ])
          }
        }
      })
    ]
  }
})
