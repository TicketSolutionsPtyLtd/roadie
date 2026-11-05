import type { Command } from '@tiptap/core'
import { Fragment, type Node, Slice } from '@tiptap/pm/model'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import { dropPoint } from '@tiptap/pm/transform'

import { COLUMN_COUNTS } from '../schema/emailAttrs'
import { HEADING_LEVELS } from '../schema/headings'
import { BLOCK_ID } from '../schema/presetShapes'

/** The node types whose children each get a block handle. */
export type BlockContainers = ReadonlySet<string>

export const TOP_LEVEL: BlockContainers = new Set(['doc'])

/** The keys for each block action, as the block menu shows them. */
export const BLOCK_ACTION_KEYS = {
  moveUp: ['mod', 'shift', 'arrowup'],
  moveDown: ['mod', 'shift', 'arrowdown'],
  duplicate: ['mod', 'd'],
  delete: ['delete']
} as const

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
  const { selection } = state
  const caretInside =
    selection instanceof TextSelection &&
    selection.from > from &&
    selection.to < from + node.nodeSize
  // A keyboard move mid-sentence carries on typing where it was.
  if (caretInside) {
    const offset = landed - from
    return tr
      .setSelection(
        TextSelection.create(
          tr.doc,
          selection.anchor + offset,
          selection.head + offset
        )
      )
      .scrollIntoView()
  }
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
export function withoutIds(node: Node): Node {
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

/** Where the column holding the block at `pos` starts, if it's in one. */
export function columnOf(doc: Node, pos: number): number | null {
  const $pos = doc.resolve(pos)
  return $pos.parent.type.name === 'column' ? $pos.before() : null
}

const COLUMNS = {
  min: Math.min(...COLUMN_COUNTS),
  max: Math.max(...COLUMN_COUNTS)
}

const columnPlace = (doc: Node, pos: number) => {
  const $pos = doc.resolve(pos)
  return { row: $pos.parent, index: $pos.index() }
}

/** Whether the column at `pos` has a neighbour to swap with, left (-1) or right (1). */
export function canMoveColumn(doc: Node, pos: number, step: -1 | 1) {
  const { row, index } = columnPlace(doc, pos)
  const to = index + step
  return to >= 0 && to < row.childCount
}

/** Swaps the column at `pos` with its neighbour, left (-1) or right (1), in one step. */
export function moveColumn(state: EditorState, pos: number, step: -1 | 1) {
  if (!canMoveColumn(state.doc, pos, step)) return null
  const column = state.doc.nodeAt(pos)!
  const $pos = state.doc.resolve(pos)
  const neighbour =
    step === 1 ? state.doc.nodeAt(pos + column.nodeSize)! : $pos.nodeBefore!
  const from = step === 1 ? pos : pos - neighbour.nodeSize
  const to = from + column.nodeSize + neighbour.nodeSize
  const tr = state.tr.replaceWith(
    from,
    to,
    step === 1 ? [neighbour, column] : [column, neighbour]
  )
  const landed = step === 1 ? from + neighbour.nodeSize : from
  return tr
    .setSelection(TextSelection.near(tr.doc.resolve(landed + 1)))
    .scrollIntoView()
}

export const canAddColumn = (doc: Node, pos: number) =>
  columnPlace(doc, pos).row.childCount < COLUMNS.max

export const canRemoveColumn = (doc: Node, pos: number) =>
  columnPlace(doc, pos).row.childCount > COLUMNS.min

/** Puts a copy of the column at `pos` after it, while the row has room. */
export function duplicateColumn(state: EditorState, pos: number) {
  if (!canAddColumn(state.doc, pos)) return null
  const column = state.doc.nodeAt(pos)!
  const to = pos + column.nodeSize
  const tr = state.tr.insert(to, withoutIds(column))
  return tr
    .setSelection(TextSelection.near(tr.doc.resolve(to + 1)))
    .scrollIntoView()
}

/** Removes the column at `pos`, while the row keeps two. */
export function deleteColumn(state: EditorState, pos: number) {
  if (!canRemoveColumn(state.doc, pos)) return null
  const column = state.doc.nodeAt(pos)!
  const tr = state.tr.delete(pos, pos + column.nodeSize)
  return tr
    .setSelection(
      TextSelection.near(tr.doc.resolve(Math.min(pos, tr.doc.content.size)))
    )
    .scrollIntoView()
}

/** What Turn into can make a text block. */
export type BlockKind =
  | { type: 'paragraph' }
  | { type: 'heading'; level: number }
  | { type: 'bulletList' }
  | { type: 'orderedList' }
  | { type: 'blockquote' }

export const TEXT_BLOCK_KINDS: readonly BlockKind[] = [
  { type: 'paragraph' },
  ...HEADING_LEVELS.map((level) => ({ type: 'heading' as const, level })),
  { type: 'bulletList' },
  { type: 'orderedList' },
  { type: 'blockquote' }
]

const isKind = (node: Node, kind: BlockKind) =>
  kind.type === node.type.name &&
  (kind.type !== 'heading' || kind.level === node.attrs.level)

/** The kind of the block at `pos`, if Turn into can change it. */
export function blockKind(doc: Node, pos: number): BlockKind | null {
  const node = doc.nodeAt(pos)
  return (node && TEXT_BLOCK_KINDS.find((kind) => isKind(node, kind))) ?? null
}

function makeKind(kind: BlockKind): Command {
  switch (kind.type) {
    case 'heading':
      return ({ commands }) =>
        commands.setNode('heading', { level: kind.level })
    case 'bulletList':
      return ({ commands }) => commands.toggleBulletList()
    case 'orderedList':
      return ({ commands }) => commands.toggleOrderedList()
    case 'blockquote':
      return ({ commands }) => commands.wrapIn('blockquote')
    default:
      return () => true
  }
}

/**
 * Turns the text block at `pos`, or each from there to `end`, into another
 * kind, in one step, keeping its text and the first block's `blockId`.
 */
export function turnInto(pos: number, kind: BlockKind, end?: number): Command {
  return ({ tr, chain }) => {
    const node = tr.doc.nodeAt(pos)
    if (!node) return false
    const id: unknown = node.attrs[BLOCK_ID]
    const to = end ?? pos + node.nodeSize
    const { selection } = tr
    return chain()
      .command(({ tr: current }) => {
        const { doc } = current
        current.setSelection(
          TextSelection.between(doc.resolve(pos), doc.resolve(to))
        )
        return true
      })
      .clearNodes()
      .command(makeKind(kind))
      .command(({ tr: current }) => {
        const at = current.mapping.map(pos, -1)
        const turned = current.doc.nodeAt(at)
        if (id && turned && BLOCK_ID in turned.attrs) {
          current.setNodeAttribute(at, BLOCK_ID, id)
        }
        // The caret goes back where it was, not over the turned text.
        current.setSelection(selection.map(current.doc, current.mapping))
        return true
      })
      .run()
  }
}

/** Opens a line at `at`, a block's end, with `/` typed there to open the insert menu. */
export function insertBelow(state: EditorState, at: number) {
  const { schema } = state
  const tr = state.tr.insert(
    at,
    schema.nodes.paragraph!.create(null, schema.text('/'))
  )
  return tr.setSelection(TextSelection.create(tr.doc, at + 2))
}

/** The `blockId` of the block at `pos`, to link to it. */
export function blockIdAt(doc: Node, pos: number): string | null {
  const id: unknown = doc.nodeAt(pos)?.attrs[BLOCK_ID]
  return typeof id === 'string' && id !== '' ? id : null
}

/** Where the block with this `blockId` starts, if there is one. */
export function findBlockId(doc: Node, id: string): number | null {
  let found: number | null = null
  doc.descendants((node, pos) => {
    if (found === null && node.attrs[BLOCK_ID] === id) found = pos
    return found === null
  })
  return found
}
