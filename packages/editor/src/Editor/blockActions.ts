import { Fragment, type Node, Slice } from '@tiptap/pm/model'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import { dropPoint } from '@tiptap/pm/transform'

import { BLOCK_ID } from '../schema/presetShapes'

/** The node types whose children each get a block handle. */
export type BlockContainers = ReadonlySet<string>

export const TOP_LEVEL: BlockContainers = new Set(['doc'])

/**
 * Where the innermost block holding `pos` starts, or the block starting at
 * `pos`, counting only children of `containers`. Null at the doc's edges.
 */
export function blockAt(
  state: EditorState,
  pos: number,
  containers: BlockContainers = TOP_LEVEL
): number | null {
  const $pos = state.doc.resolve(Math.min(pos, state.doc.content.size))
  // Between blocks, or on an atom such as an image: the block that follows.
  if (containers.has($pos.parent.type.name) && $pos.nodeAfter) return pos
  for (let depth = $pos.depth; depth >= 1; depth--) {
    if (containers.has($pos.node(depth - 1).type.name)) {
      return $pos.before(depth)
    }
  }
  return null
}

/** Where the block holding the block at `pos` starts, if it has one. */
export function parentBlock(
  state: EditorState,
  pos: number,
  containers: BlockContainers = TOP_LEVEL
): number | null {
  const $pos = state.doc.resolve(pos)
  for (let depth = $pos.depth; depth >= 1; depth--) {
    if (containers.has($pos.node(depth - 1).type.name)) {
      return $pos.before(depth)
    }
  }
  return null
}

/**
 * Every place `node` could go, in reading order: each gap between the
 * children of a container that can hold it, outside the node itself.
 */
function places(doc: Node, pos: number, containers: BlockContainers) {
  const node = doc.nodeAt(pos)!
  const found: number[] = []
  const gaps = (parent: Node, start: number) => {
    let at = start
    for (let index = 0; index <= parent.childCount; index++) {
      if (parent.canReplaceWith(index, index, node.type)) found.push(at)
      if (index < parent.childCount) at += parent.child(index).nodeSize
    }
  }
  gaps(doc, 0)
  doc.descendants((child, childPos) => {
    if (childPos === pos) return false
    if (containers.has(child.type.name)) gaps(child, childPos + 1)
    return true
  })
  return found
    .filter((at) => at < pos || at > pos + node.nodeSize)
    .sort((a, b) => a - b)
}

/**
 * The next place the block at `pos` can go up (-1) or down (1), into and
 * out of the containers on its way.
 */
function nextPlace(
  doc: Node,
  pos: number,
  step: -1 | 1,
  containers: BlockContainers
) {
  const all = places(doc, pos, containers)
  return step === 1
    ? all.find((at) => at > pos)
    : all.findLast((at) => at < pos)
}

/** Whether the block at `pos` has a place to move to, up or down. */
export function canMoveBlock(
  doc: Node,
  pos: number,
  step: -1 | 1,
  containers: BlockContainers = TOP_LEVEL
) {
  return nextPlace(doc, pos, step, containers) !== undefined
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

const isEmptyLine = (node: Node) =>
  node.type.name === 'paragraph' && node.content.size === 0

// A container must hold a block, so one emptied keeps an empty line.
function removeBlock(tr: Transaction, pos: number) {
  const node = tr.doc.nodeAt(pos)!
  const { parent } = tr.doc.resolve(pos)
  if (parent.childCount > 1) return tr.delete(pos, pos + node.nodeSize)
  const line = tr.doc.type.schema.nodes.paragraph!.create()
  return tr.replaceWith(pos, pos + node.nodeSize, line)
}

/**
 * Moves the block at `from` to the gap at `to`, in one step. Moved into a
 * container holding only an empty line, it takes that line's place.
 */
export function moveBlockTo(state: EditorState, from: number, to: number) {
  const node = state.doc.nodeAt(from)
  if (!node) return null
  const $to = state.doc.resolve(to)
  const tr = state.tr
  const fills =
    $to.parent !== state.doc.resolve(from).parent &&
    $to.parent.childCount === 1 &&
    isEmptyLine($to.parent.firstChild!)
  const at = fills ? $to.start() : to
  if (fills) tr.replaceWith($to.start(), $to.end(), node)
  else tr.insert(to, node)
  const moved = tr.mapping.map(from)
  const step = tr.steps.length
  removeBlock(tr, moved)
  const landed = tr.mapping.slice(step).map(at)
  return selectBlock(tr, landed).scrollIntoView()
}

/** Moves the block at `pos` to the next place it can go, up (-1) or down (1). */
export function moveBlock(
  state: EditorState,
  pos: number,
  step: -1 | 1,
  containers: BlockContainers = TOP_LEVEL
) {
  const to = nextPlace(state.doc, pos, step, containers)
  return to === undefined ? null : moveBlockTo(state, pos, to)
}

/**
 * Where the block at `from` lands when dropped at `pos`: ProseMirror's own
 * drop point, as its drop line shows, unless that leaves the section or
 * column under the pointer, which can't hold the block. Null for a drop that
 * moves nothing.
 */
export function blockDropTarget(
  doc: Node,
  from: number,
  pos: number,
  containers: BlockContainers
) {
  const node = doc.nodeAt(from)
  if (!node) return null
  const at = dropPoint(doc, pos, new Slice(Fragment.from(node), 0, 0))
  if (at == null || (at >= from && at <= from + node.nodeSize)) return null
  const $pos = doc.resolve(pos)
  let inside = $pos.depth
  while (inside > 0 && !containers.has($pos.node(inside).type.name)) inside--
  return doc.resolve(at).depth < inside ? null : at
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

/** Removes the block at `pos`, leaving an empty line in a container it empties. */
export function deleteBlock(state: EditorState, pos: number) {
  if (!state.doc.nodeAt(pos)) return null
  const tr = removeBlock(state.tr, pos)
  const at = Math.min(pos, tr.doc.content.size)
  return tr
    .setSelection(TextSelection.near(tr.doc.resolve(at)))
    .scrollIntoView()
}
