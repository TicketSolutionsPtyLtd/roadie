import { type CommandProps, Extension } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import {
  type EditorState,
  Plugin,
  PluginKey,
  Selection,
  TextSelection
} from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

type EmptyLineHintOptions = { hint: () => string | undefined }

type LineHint = { pos: number; hint: string }

const lineHints = new PluginKey<DecorationSet>('lineHints')

type MenuStorage = Record<
  string,
  { key?: PluginKey<{ active: boolean }> } | undefined
>

// The `/` and `{{` menus take Enter while open, and run after this.
const menuOpen = (storage: object, state: EditorState) =>
  ['insertMenu', 'mergeTagMenu'].some(
    (name) => (storage as MenuStorage)[name]?.key?.getState(state)?.active
  )

const isEmptyLine = (node: PMNode | null) =>
  Boolean(node?.isTextblock && node.content.size === 0)

/**
 * Shows `hints`, in order, on the empty lines of the top-level block holding
 * the selection, as a ready-made section's placeholder copy. Each goes once
 * its line has text, so there's nothing to delete, and none is saved.
 */
export function hintLines(hints: readonly (string | undefined)[]) {
  return ({ tr }: CommandProps) => {
    const { $from } = tr.selection
    if ($from.depth < 1) return true
    const start = $from.before(1)
    const found: LineHint[] = []
    let index = 0
    tr.doc.nodeAt(start)?.descendants((node, pos) => {
      if (!node.isTextblock) return true
      const hint = hints[index++]
      if (hint && isEmptyLine(node)) found.push({ pos: start + 1 + pos, hint })
      return false
    })
    tr.setMeta(lineHints, found)
    return true
  }
}

/**
 * Marks the caret's empty paragraph with `data-hint`, which editor.css shows
 * while the editor has focus, and the lines `hintLines` names with
 * `data-copy-hint`, shown always. An empty document is Placeholder's to mark.
 */
export const EmptyLineHint = Extension.create<EmptyLineHintOptions>({
  name: 'emptyLineHint',
  // Ahead of a list item's or heading's own Enter, which would split them.
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      // At a line's end, Enter moves into the next line while it shows
      // placeholder copy, as a form moves to its next field.
      Enter: ({ editor }) => {
        const { state } = editor
        const { $from, empty } = state.selection
        const atEnd =
          empty &&
          $from.parent.isTextblock &&
          $from.parentOffset === $from.parent.content.size
        if (!atEnd || menuOpen(editor.storage, state)) return false
        const next = Selection.findFrom(
          state.doc.resolve($from.after()),
          1,
          true
        )
        if (!(next instanceof TextSelection)) return false
        // Within its own section, not into the next one's first line.
        if (next.$from.before(1) !== $from.before(1)) return false
        if (!isEmptyLine(next.$from.parent)) return false
        const line = next.$from.before()
        const hinted = lineHints
          .getState(state)
          ?.find(line, line + 1)
          .some(({ from }) => from === line)
        if (!hinted) return false
        editor.view.dispatch(state.tr.setSelection(next).scrollIntoView())
        return true
      }
    }
  },

  addOptions() {
    return { hint: () => undefined }
  },

  addProseMirrorPlugins() {
    const { editor } = this
    const { hint } = this.options
    return [
      new Plugin<DecorationSet>({
        key: lineHints,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, previous) => {
            let set = previous.map(tr.mapping, tr.doc)
            const added = tr.getMeta(lineHints) as LineHint[] | undefined
            if (added?.length) {
              set = set.add(
                tr.doc,
                added.map(({ pos, hint: copy }) =>
                  Decoration.node(pos, pos + tr.doc.nodeAt(pos)!.nodeSize, {
                    'data-copy-hint': copy
                  })
                )
              )
            }
            if (!tr.docChanged) return set
            const filled = set
              .find()
              .filter(
                ({ from, to }) =>
                  !isEmptyLine(tr.doc.nodeAt(from)) ||
                  tr.doc.nodeAt(from)!.nodeSize !== to - from
              )
            return filled.length ? set.remove(filled) : set
          }
        },
        props: {
          decorations: (state) => {
            // Placeholder copy read as content would mislead a reader.
            if (!editor.isEditable) return null
            const copies = lineHints.getState(state) ?? DecorationSet.empty
            const { doc, selection } = state
            const text = hint()
            const { $from, empty } = selection
            const line = $from.parent
            const emptyDoc = doc.childCount === 1 && doc.firstChild === line
            const atLine = $from.depth > 0 ? $from.before() : -1
            if (
              !text ||
              !empty ||
              emptyDoc ||
              line.type.name !== 'paragraph' ||
              line.content.size > 0 ||
              copies.find(atLine, atLine + 1).length > 0
            ) {
              return copies
            }
            return copies.add(doc, [
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
