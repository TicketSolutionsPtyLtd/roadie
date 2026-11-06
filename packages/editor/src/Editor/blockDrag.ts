import { Extension } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

import {
  type BlockContainers,
  blockAt,
  blockDropTarget,
  moveBlockTo
} from './blockActions'

type DraggedBlock = { from: number; containers: BlockContainers }

/** The block being dragged by its handle, per editor. */
export const draggedBlocks = new WeakMap<EditorView, DraggedBlock>()

type Pointer = { clientX: number; clientY: number }

/**
 * Where the dragged block would go: before the block under the pointer, or
 * after it once the pointer is past its middle. Undefined when no block is
 * being dragged by its handle, and null where it can't go.
 */
function dropTarget(view: EditorView, { clientX, clientY }: Pointer) {
  const dragged = draggedBlocks.get(view)
  if (!dragged) return undefined
  const hit = view.posAtCoords({ left: clientX, top: clientY })
  if (!hit) return null
  const { state } = view
  // Past a section's or a column's last block: its end, as ProseMirror finds.
  const inside = hit.inside >= 0 ? state.doc.nodeAt(hit.inside) : null
  if (inside && dragged.containers.has(inside.type.name)) {
    return blockDropTarget(state.doc, dragged.from, hit.pos, dragged.containers)
  }
  const under = blockAt(
    state,
    hit.inside >= 0 ? hit.inside : hit.pos,
    dragged.containers
  )
  const dom = under === null ? null : view.nodeDOM(under)
  if (under === null || !(dom instanceof HTMLElement)) return null
  const { top, bottom } = dom.getBoundingClientRect()
  const after = clientY > (top + bottom) / 2
  const at = after ? under + state.doc.nodeAt(under)!.nodeSize : under
  return blockDropTarget(state.doc, dragged.from, at, dragged.containers)
}

// A disabled drop cursor keeps its last line, and leaving the editor clears it.
const clearDropLine = (view: EditorView) =>
  view.dom.dispatchEvent(new DragEvent('dragleave'))

/**
 * Drops a block dragged by its handle before or after the block under the
 * pointer, by which half it's over, as one undo step, and refuses a drop
 * there that can't hold it.
 */
export const BlockDrag = Extension.create({
  name: 'blockDrag',

  // The drop line reads this from the node under the pointer. It runs with
  // each node's own options, so the drag carries the containers.
  extendNodeSchema() {
    return {
      disableDropCursor: (
        view: EditorView,
        hit: { pos: number },
        event: DragEvent
      ) => {
        const target = dropTarget(view, event)
        if (target === undefined) return false
        if (target === null) return true
        // The line goes where `hit` says once this returns, so it moves to
        // the edge the drop will land on.
        hit.pos = target
        return false
      }
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('blockDrag'),
        props: {
          handleDOMEvents: {
            dragover: (view, event) => {
              if (dropTarget(view, event) === null) {
                event.dataTransfer!.dropEffect = 'none'
                clearDropLine(view)
              }
              return false
            }
          },
          handleDrop: (view, event) => {
            const dragged = draggedBlocks.get(view)
            if (!dragged) return false
            const to = dropTarget(view, event)
            draggedBlocks.delete(view)
            const tr =
              to == null ? null : moveBlockTo(view.state, dragged.from, to)
            if (tr) view.dispatch(closeHistory(tr))
            view.focus()
            return true
          }
        }
      })
    ]
  }
})
