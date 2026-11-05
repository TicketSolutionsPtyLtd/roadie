import { Extension } from '@tiptap/core'
import {
  type EditorState,
  Plugin,
  PluginKey,
  TextSelection
} from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'

import { type BlockContainers, TOP_LEVEL, blockAt } from './blockActions'
import { BlockSelection, blocksIn } from './blockSelection'

type FocusedBlockOptions = { containers: BlockContainers }
const key = new PluginKey<DecorationSet>('focusedBlock')

function focusedBlock(
  state: EditorState,
  containers: BlockContainers
): DecorationSet {
  const { selection } = state
  if (selection instanceof BlockSelection) {
    const marks = blocksIn(state.doc, selection.from, selection.to).map(
      ({ node, pos }) =>
        Decoration.node(pos, pos + node.nodeSize, { 'data-focused-block': '' })
    )
    return DecorationSet.create(state.doc, marks)
  }
  if (!(selection instanceof TextSelection)) return DecorationSet.empty
  const from = blockAt(state, selection.from, containers)
  const node = from === null ? null : state.doc.nodeAt(from)
  if (from === null || !node || selection.to > from + node.nodeSize) {
    return DecorationSet.empty
  }
  return DecorationSet.create(state.doc, [
    Decoration.node(from, from + node.nodeSize, { 'data-focused-block': '' })
  ])
}

/**
 * Marks the block holding the caret with `data-focused-block` while the
 * editor has focus, so focus shows on the block, not around the editor, and
 * each block of a block selection. A selected node rings itself, and a text
 * selection across blocks marks none.
 */
export const FocusedBlock = Extension.create<FocusedBlockOptions>({
  name: 'focusedBlock',

  addOptions() {
    return { containers: TOP_LEVEL }
  },

  addProseMirrorPlugins() {
    const { editor, options } = this
    const marked = (state: EditorState) =>
      editor.isEditable && editor.isFocused
        ? focusedBlock(state, options.containers)
        : DecorationSet.empty
    // Outside the state, as a transaction mid-press moves the caret too.
    let pressed = false

    return [
      new Plugin<DecorationSet>({
        key,
        state: {
          init: () => DecorationSet.empty,
          // Firefox loses a click's caret if the marks change before the
          // press ends, so they hold still until it does.
          apply: (tr, previous, _old, state) =>
            pressed ? previous.map(tr.mapping, tr.doc) : marked(state)
        },
        props: {
          decorations: (state) => key.getState(state),
          handleDOMEvents: {
            mousedown(view) {
              pressed = true
              // After ProseMirror reads the click's selection on mouseup.
              const release = () => {
                document.removeEventListener('mouseup', release)
                document.removeEventListener('dragend', release)
                setTimeout(() => {
                  pressed = false
                  if (!view.isDestroyed) view.dispatch(view.state.tr)
                })
              }
              document.addEventListener('mouseup', release)
              // A press that drags text ends with no mouseup.
              document.addEventListener('dragend', release)
              return false
            }
          }
        }
      })
    ]
  }
})

const menuKey = new PluginKey<DecorationSet>('menuBlock')

/**
 * Marks the block at `pos` with `data-menu-block`, or each block from `pos`
 * to `end`, or none with `null`.
 */
export function markMenuBlock(
  view: EditorView,
  pos: number | null,
  end?: number
) {
  view.dispatch(
    view.state.tr.setMeta(menuKey, pos === null ? null : { pos, end })
  )
}

/** The blocks a block menu is open on, which `markMenuBlock` sets. */
export const MenuBlock = Extension.create({
  name: 'menuBlock',

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: menuKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, previous, _old, state) {
            const meta: { pos: number; end?: number } | null | undefined =
              tr.getMeta(menuKey)
            if (meta === undefined) return previous.map(tr.mapping, tr.doc)
            const node = meta === null ? null : state.doc.nodeAt(meta.pos)
            if (meta === null || !node) return DecorationSet.empty
            const end = meta.end ?? meta.pos + node.nodeSize
            return DecorationSet.create(
              state.doc,
              blocksIn(state.doc, meta.pos, end).map(({ node: block, pos }) =>
                Decoration.node(pos, pos + block.nodeSize, {
                  'data-menu-block': ''
                })
              )
            )
          }
        },
        props: { decorations: (state) => menuKey.getState(state) }
      })
    ]
  }
})
