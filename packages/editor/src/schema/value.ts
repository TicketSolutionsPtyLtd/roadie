import type { JSONContent } from '@tiptap/core'

import { isUnsafeHref } from '@oztix/roadie-core/utils'

import { embedAttrs } from './embedAttrs'
import { headingLevel } from './headings'
import { isSafeImageSrc } from './imageSrc'
import {
  BLOCK_ID,
  type NodeContent,
  type NodeShape,
  type Preset,
  type PresetShape,
  isPreset,
  presetShapes
} from './presetShapes'
import { isSpan } from './spans'

export const CURRENT_VERSION = 1

export type EditorValue = {
  version: number
  preset: Preset
  doc: JSONContent
}

/** A value as read back from storage, before `migrate` checks it. */
export type StoredEditorValue = {
  version: number
  preset: string
  doc: JSONContent
}

type StoredMark = NonNullable<JSONContent['marks']>[number]

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function picked(attrs: unknown, names: NodeShape['attrs'] = []) {
  if (!isObject(attrs)) return undefined
  if (names === 'stored') {
    return Object.keys(attrs).length > 0 ? { ...attrs } : undefined
  }
  const kept = names.filter((name) => Object.hasOwn(attrs, name))
  if (kept.length === 0) return undefined
  return Object.fromEntries(kept.map((name) => [name, attrs[name]]))
}

function isKeptMark(mark: unknown, shape: PresetShape): mark is StoredMark {
  if (!isObject(mark) || typeof mark.type !== 'string') return false
  if (!Object.hasOwn(shape.marks, mark.type)) return false
  if (mark.type !== 'link') return true
  const href: unknown = (mark as StoredMark).attrs?.href
  return typeof href === 'string' && !isUnsafeHref(href)
}

// The schema holds one mark of each type, so a repeat is dropped.
function cleanedMarks(marks: unknown[], shape: PresetShape) {
  const kept = new Map<string, StoredMark>()
  for (const mark of marks) {
    if (!isKeptMark(mark, shape) || kept.has(mark.type)) continue
    const attrs = picked(mark.attrs, shape.marks[mark.type])
    kept.set(mark.type, { type: mark.type, ...(attrs && { attrs }) })
  }
  return [...kept.values()]
}

function cleanedAttrs({ type, attrs }: JSONContent) {
  if (type === 'tableCell' || type === 'tableHeader') {
    const { colspan, rowspan } = attrs ?? {}
    return {
      ...(isSpan('colspan', colspan) && { colspan }),
      ...(isSpan('rowspan', rowspan) && { rowspan })
    }
  }
  if (type === 'heading') return { ...attrs, level: headingLevel(attrs?.level) }
  if (type === 'image') {
    const alt: unknown = attrs?.alt
    return { ...attrs, alt: typeof alt === 'string' ? alt : '' }
  }
  if (type === 'embed') return embedAttrs(attrs) ?? undefined
  if (type === 'orderedList') {
    const { start, type: listType } = attrs ?? {}
    return {
      ...(Number.isInteger(start) && { start }),
      ...(typeof listType === 'string' && { type: listType })
    }
  }
  return attrs
}

// An id that isn't a string, or is empty, is dropped, so the editor gives the
// block a new one.
function withBlockId(attrs: JSONContent['attrs'], stored: unknown) {
  const kept = isObject(attrs) ? { ...attrs } : {}
  delete kept[BLOCK_ID]
  const id = isObject(stored) ? stored[BLOCK_ID] : undefined
  return typeof id === 'string' && id !== ''
    ? { ...kept, [BLOCK_ID]: id }
    : kept
}

// A repeated id would make two blocks one to drag or link to, so each block
// after the first to use it loses it.
function withoutRepeatedIds(
  node: JSONContent,
  seen = new Set<unknown>()
): JSONContent {
  const kept = { ...node }
  const id: unknown = node.attrs?.[BLOCK_ID]
  if (id !== undefined && seen.has(id)) {
    const attrs = { ...node.attrs }
    delete attrs[BLOCK_ID]
    delete kept.attrs
    if (Object.keys(attrs).length > 0) kept.attrs = attrs
  }
  seen.add(id)
  if (node.content) {
    kept.content = node.content.map((child) => withoutRepeatedIds(child, seen))
  }
  return kept
}

function isSafeNode(node: unknown): node is JSONContent {
  if (!isObject(node)) return false
  const { type, attrs, text } = node as JSONContent
  if (type === 'text') return typeof text === 'string' && text !== ''
  if (type === 'image') return isSafeImageSrc(attrs?.src)
  if (type === 'embed') return embedAttrs(attrs) !== null
  return true
}

// A doc is the root only, so one below it gives way to its blocks.
function shapeOf({ type }: JSONContent, shape: PresetShape) {
  return typeof type === 'string' &&
    type !== 'doc' &&
    Object.hasOwn(shape.nodes, type)
    ? shape.nodes[type]
    : undefined
}

function isInline(node: JSONContent, shape: PresetShape) {
  return shapeOf(node, shape)?.inline === true
}

function inlineWithin(node: JSONContent, shape: PresetShape): JSONContent[] {
  if (isInline(node, shape)) return [node]
  return (node.content ?? []).flatMap((child) => inlineWithin(child, shape))
}

// Each run of nodes `inRun` picks is wrapped in a node of its own.
function wrapRuns(
  nodes: JSONContent[],
  inRun: (node: JSONContent) => boolean,
  wrap: (run: JSONContent[]) => JSONContent
) {
  const wrapped: JSONContent[] = []
  let run: JSONContent[] = []
  const endRun = () => {
    if (run.length > 0) wrapped.push(wrap(run))
    run = []
  }
  for (const node of nodes) {
    if (inRun(node)) {
      run.push(node)
      continue
    }
    endRun()
    wrapped.push(node)
  }
  endRun()
  return wrapped
}

function paragraphsAround(nodes: JSONContent[], shape: PresetShape) {
  return wrapRuns(
    nodes,
    (node) => isInline(node, shape),
    (content) => ({ type: 'paragraph', content })
  )
}

function paragraphFirst(blocks: JSONContent[]) {
  return blocks[0]?.type === 'paragraph'
    ? blocks
    : [{ type: 'paragraph' }, ...blocks]
}

const isCell = ({ type }: JSONContent) =>
  type === 'tableCell' || type === 'tableHeader'

// List items sit only in lists, and rows and cells only in tables.
function unwrapped(node: JSONContent): JSONContent[] {
  if (node.type !== 'listItem' && node.type !== 'tableRow' && !isCell(node)) {
    return [node]
  }
  return (node.content ?? []).flatMap(unwrapped)
}

function paragraphsWithin(
  node: JSONContent,
  shape: PresetShape
): JSONContent[] {
  if (node.type === 'paragraph') return [node]
  if (shapeOf(node, shape)?.content === 'inline') {
    return node.content?.length
      ? [{ type: 'paragraph', content: node.content }]
      : []
  }
  return (node.content ?? []).flatMap((child) => paragraphsWithin(child, shape))
}

function cellsOf(node: JSONContent, shape: PresetShape): JSONContent[] {
  if (isCell(node)) return [node]
  if (node.type === 'tableRow') return node.content ?? []
  const paragraphs = paragraphsWithin(node, shape)
  return paragraphs.length > 0
    ? [{ type: 'tableCell', content: paragraphs }]
    : []
}

// Reshapes children so each sits where the schema can read it, keeping text.
function fitted(
  nodes: JSONContent[],
  content: NodeContent,
  shape: PresetShape
) {
  if (content === 'inline') {
    return nodes.flatMap((node) => inlineWithin(node, shape))
  }
  const blocks = paragraphsAround(nodes, shape)
  if (content === 'listItems') {
    return blocks.map((node) =>
      node.type === 'listItem'
        ? node
        : { type: 'listItem', content: paragraphFirst(unwrapped(node)) }
    )
  }
  if (content === 'paragraphs') {
    const paragraphs = blocks.flatMap((node) => paragraphsWithin(node, shape))
    return paragraphs.length > 0 ? paragraphs : [{ type: 'paragraph' }]
  }
  if (content === 'tableCells') {
    return blocks.flatMap((node) => cellsOf(node, shape))
  }
  if (content === 'tableRows') {
    return wrapRuns(
      blocks.flatMap((node) =>
        node.type === 'tableRow' ? [node] : cellsOf(node, shape)
      ),
      isCell,
      (cells) => ({ type: 'tableRow', content: cells })
    )
  }
  const unwrappedBlocks = blocks.flatMap(unwrapped)
  return content === 'paragraphFirst'
    ? paragraphFirst(unwrappedBlocks)
    : unwrappedBlocks
}

function childrenOf(content: unknown, shape: PresetShape) {
  if (!Array.isArray(content)) return []
  return content.filter(isSafeNode).flatMap((child) => cleaned(child, shape))
}

// JSON skips the schema's parseHTML checks, so stored values are checked here.
// A node the preset doesn't hold gives way to its children, its text in a
// paragraph of its own, which a parent holding inline content unwraps. A
// node that must hold blocks, list items, rows or cells and is left with none
// is dropped.
function cleaned(
  node: JSONContent,
  shape: PresetShape,
  nodeShape = shapeOf(node, shape)
): JSONContent[] {
  if (!nodeShape)
    return paragraphsAround(childrenOf(node.content, shape), shape)
  const { type, text, marks, content, attrs: stored } = node
  const attrs = picked(
    withBlockId(cleanedAttrs({ type, attrs: stored }), stored),
    nodeShape.attrs
  )
  // Built from known keys, as the saved format keeps nothing else. Only
  // inline nodes take marks.
  const kept: JSONContent = {
    type,
    ...(type === 'text' && { text }),
    ...(attrs && { attrs }),
    ...(nodeShape.inline &&
      Array.isArray(marks) && { marks: cleanedMarks(marks, shape) })
  }
  if (nodeShape.content === 'none') return [kept]
  if (nodeShape.content === 'inline') {
    return [
      Array.isArray(content)
        ? {
            ...kept,
            content: fitted(childrenOf(content, shape), 'inline', shape)
          }
        : kept
    ]
  }
  const children = fitted(childrenOf(content, shape), nodeShape.content, shape)
  return children.length > 0 ? [{ ...kept, content: children }] : []
}

export type MigrateOptions = {
  /**
   * An app's own blocks to keep, by node name: atoms whose stored attrs are
   * kept as they are, with no content or marks. A name the preset already
   * uses is ignored.
   */
  customBlocks?: readonly string[]
}

// An app's blocks join the preset's nodes as atoms that keep their attrs.
function withCustomBlocks(
  shape: PresetShape,
  names: readonly string[]
): PresetShape {
  const nodes: Record<string, NodeShape> = { ...shape.nodes }
  for (const name of names) {
    if (!Object.hasOwn(nodes, name)) {
      nodes[name] = { content: 'none', attrs: 'stored' }
    }
  }
  return { ...shape, nodes }
}

/**
 * Brings a stored value up to `CURRENT_VERSION`, in `preset` when given or
 * the value's own preset otherwise. Throws a RangeError on a preset or
 * version this package doesn't know, so a newer value is never read as an
 * older one, and on a value or doc that isn't an object.
 *
 * Every node and mark the preset doesn't hold is dropped, keeping its text:
 * a block's text becomes a paragraph, and a mark's text stays unmarked. A
 * doc below the root gives way to its blocks. So the editor never meets
 * content it can't load. Skips content or marks that
 * aren't a list, any child or mark that isn't an object, and empty text. Drops
 * any link whose href could run script, keeping its text, any image not on
 * https or the same site, and any embed that isn't a provider and id. Reads a
 * heading outside h2 to h4 as the nearest of them, and missing alt text as
 * empty. Keeps only the keys, attrs, and first of each mark the preset saves,
 * marks only on inline nodes and an ordered list's start only when whole,
 * starts every list item with a paragraph, drops a list or quote left empty,
 * and gives an empty doc one paragraph. Keeps a block's `blockId` only when
 * it's a non-empty string no earlier block uses. Keeps only cells in a
 * table's rows, and only paragraphs in a cell, unwrapping other blocks to
 * their text;
 * keeps a cell's spans only when whole, positive and no more than HTML
 * allows (1,000 columns, 65,534 rows), gives an empty cell a paragraph, and
 * drops a row with no cells and a table with no rows. Drops an app's own
 * block unless `customBlocks` names it.
 */
export function migrate(
  value: StoredEditorValue,
  preset: Preset = value?.preset as Preset,
  { customBlocks = [] }: MigrateOptions = {}
): EditorValue {
  if (!isObject(value)) {
    throw new RangeError('An EditorValue must be an object.')
  }
  const { version, doc } = value
  if (!Number.isInteger(version) || version < 1 || version > CURRENT_VERSION) {
    throw new RangeError(
      `Unsupported EditorValue version ${version}; this package reads 1 to ${CURRENT_VERSION}.`
    )
  }
  for (const named of [value.preset, preset]) {
    if (!isPreset(named)) {
      throw new RangeError(`Unknown EditorValue preset "${named}".`)
    }
  }
  if (!isObject(doc)) {
    throw new RangeError('An EditorValue’s doc must be an object.')
  }
  const shape = withCustomBlocks(presetShapes[preset], customBlocks)
  const [cleanedDoc = createEmptyValue(preset).doc] = cleaned(
    { ...doc, type: 'doc' },
    shape,
    shape.nodes.doc
  )
  return { version, preset, doc: withoutRepeatedIds(cleanedDoc) }
}

export function createEmptyValue(preset: Preset): EditorValue {
  return {
    version: CURRENT_VERSION,
    preset,
    doc: { type: 'doc', content: [{ type: 'paragraph' }] }
  }
}
