import { type CommandProps, Extension } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

type EmptyLineHintOptions = { hint: () => string | undefined }

type LineHint = { pos: number; hint: string }

const lineHints = new PluginKey<DecorationSet>('lineHints')

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
              !editor.isEditable ||
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
