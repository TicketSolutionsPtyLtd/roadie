import type { Node } from '@tiptap/pm/model'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'

import { BLOCK_ID } from '../schema/presetShapes'

/** Where the top-level block holding `pos` starts, or null at the doc's edges. */
export function topBlockAt(state: EditorState, pos: number): number | null {
  const $pos = state.doc.resolve(Math.min(pos, state.doc.content.size))
  if ($pos.depth >= 1) return $pos.before(1)
  // Between blocks, or on an atom such as an image: the block that follows.
  return $pos.nodeAfter ? pos : null
}

function blockIndex(doc: Node, pos: number) {
  return doc.resolve(pos).index(0)
}

/** Whether the block at `pos` has a neighbour to swap with, up or down. */
export function canMoveBlock(doc: Node, pos: number, step: -1 | 1) {
  const index = blockIndex(doc, pos) + step
  return index >= 0 && index < doc.childCount
}

// Puts the caret inside a moved text block, or selects a moved atom.
function selectBlock(tr: Transaction, pos: number) {
  const node = tr.doc.nodeAt(pos)
  if (!node) return tr
  return tr.setSelection(
    node.isTextblock || !node.isAtom
      ? TextSelection.near(tr.doc.resolve(pos + 1))
      : NodeSelection.create(tr.doc, pos)
  )
}

/** Swaps the block at `pos` with the one before (-1) or after (1). */
export function moveBlock(state: EditorState, pos: number, step: -1 | 1) {
  const { doc } = state
  if (!canMoveBlock(doc, pos, step)) return null
  const node = doc.nodeAt(pos)!
  const index = blockIndex(doc, pos)
  const neighbour = doc.child(index + step)
  const tr = state.tr.delete(pos, pos + node.nodeSize)
  const to = step === -1 ? pos - neighbour.nodeSize : pos + neighbour.nodeSize
  tr.insert(to, node)
  return selectBlock(tr, to).scrollIntoView()
}

// UniqueID fills a missing id, but keeps a repeated one it reads as moved.
function withoutIds(node: Node): Node {
  if (node.isText) return node
  const content: Node[] = []
  node.content.forEach((child) => content.push(withoutIds(child)))
  const attrs =
    BLOCK_ID in node.attrs ? { ...node.attrs, [BLOCK_ID]: null } : node.attrs
  return node.type.create(attrs, content, node.marks)
}

/** Puts a copy of the block at `pos` after it, with ids of its own. */
export function duplicateBlock(state: EditorState, pos: number) {
  const node = state.doc.nodeAt(pos)
  if (!node) return null
  const to = pos + node.nodeSize
  return selectBlock(state.tr.insert(to, withoutIds(node)), to).scrollIntoView()
}

/** Removes the block at `pos`; ProseMirror refills a doc left empty. */
export function deleteBlock(state: EditorState, pos: number) {
  const node = state.doc.nodeAt(pos)
  if (!node) return null
  const tr = state.tr.delete(pos, pos + node.nodeSize)
  const at = Math.min(pos, tr.doc.content.size)
  return tr
    .setSelection(TextSelection.near(tr.doc.resolve(at)))
    .scrollIntoView()
}
