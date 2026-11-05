import { Extension } from '@tiptap/core'
import { closeHistory } from '@tiptap/pm/history'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

import {
  type BlockContainers,
  blockDropTarget,
  moveBlockTo
} from './blockActions'

type DraggedBlock = { from: number; containers: BlockContainers }

/** The block being dragged by its handle, per editor. */
export const draggedBlocks = new WeakMap<EditorView, DraggedBlock>()

function refused(view: EditorView, pos: number) {
  const dragged = draggedBlocks.get(view)
  return (
    dragged !== undefined &&
    blockDropTarget(view.state.doc, dragged.from, pos, dragged.containers) ===
      null
  )
}

// A disabled drop cursor keeps its last line, and leaving the editor clears it.
const clearDropLine = (view: EditorView) =>
  view.dom.dispatchEvent(new DragEvent('dragleave'))

const pointerPos = (view: EditorView, event: MouseEvent) =>
  view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos

/**
 * Drops a block dragged by its handle into the section or column under the
 * pointer, as one undo step, and refuses a drop there that can't hold it.
 */
export const BlockDrag = Extension.create({
  name: 'blockDrag',

  // The drop line reads this from the node under the pointer. It runs with
  // each node's own options, so the drag carries the containers.
  extendNodeSchema() {
    return {
      disableDropCursor: (view: EditorView, { pos }: { pos: number }) =>
        refused(view, pos)
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('blockDrag'),
        props: {
          handleDOMEvents: {
            dragover: (view, event) => {
              const pos = pointerPos(view, event)
              if (pos !== undefined && refused(view, pos)) {
                event.dataTransfer!.dropEffect = 'none'
                clearDropLine(view)
              }
              return false
            }
          },
          handleDrop: (view, event) => {
            const dragged = draggedBlocks.get(view)
            if (!dragged) return false
            draggedBlocks.delete(view)
            const { from, containers } = dragged
            const pos = pointerPos(view, event)
            const to =
              pos === undefined
                ? null
                : blockDropTarget(view.state.doc, from, pos, containers)
            const tr = to === null ? null : moveBlockTo(view.state, from, to)
            if (tr) view.dispatch(closeHistory(tr))
            view.focus()
            return true
          }
        }
      })
    ]
  }
})
