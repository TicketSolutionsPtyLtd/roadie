import { Extension } from '@tiptap/core'
import {
  type EditorState,
  Plugin,
  PluginKey,
  TextSelection
} from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'

import { type BlockContainers, TOP_LEVEL, blockAt } from './blockActions'

type FocusedBlockOptions = { containers: BlockContainers }
const key = new PluginKey<DecorationSet>('focusedBlock')

function focusedBlock(
  state: EditorState,
  containers: BlockContainers
): DecorationSet {
  const { selection } = state
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
 * editor has focus, so focus shows on the block, not around the editor. A
 * selected node rings itself, and a selection across blocks marks none.
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
              const release = () =>
                setTimeout(() => {
                  pressed = false
                  if (!view.isDestroyed) view.dispatch(view.state.tr)
                })
              document.addEventListener('mouseup', release, { once: true })
              return false
            }
          }
        }
      })
    ]
  }
})

const menuKey = new PluginKey<DecorationSet>('menuBlock')

/** Marks the block at `pos` with `data-menu-block`, or none with `null`. */
export function markMenuBlock(view: EditorView, pos: number | null) {
  view.dispatch(view.state.tr.setMeta(menuKey, pos))
}

/** The block a block menu is open on, which `markMenuBlock` sets. */
export const MenuBlock = Extension.create({
  name: 'menuBlock',

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: menuKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, previous, _old, state) {
            const pos: number | null | undefined = tr.getMeta(menuKey)
            if (pos === undefined) return previous.map(tr.mapping, tr.doc)
            const node = pos === null ? null : state.doc.nodeAt(pos)
            if (pos === null || !node) return DecorationSet.empty
            return DecorationSet.create(state.doc, [
              Decoration.node(pos, pos + node.nodeSize, {
                'data-menu-block': ''
              })
            ])
          }
        },
        props: { decorations: (state) => menuKey.getState(state) }
      })
    ]
  }
})
