import type { JSONContent } from '@tiptap/core'

import { isUnsafeHref } from '@oztix/roadie-core/utils'

import { embedAttrs } from './embedAttrs'
import { headingLevel } from './headings'
import { isSafeImageSrc } from './imageSrc'
import {
  type NodeContent,
  type Preset,
  type PresetShape,
  isPreset,
  presetShapes
} from './presetShapes'

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

function isKeptMark(mark: unknown, shape: PresetShape): mark is StoredMark {
  if (!isObject(mark) || !shape.marks.includes(mark.type as string)) {
    return false
  }
  if (mark.type !== 'link') return true
  const href: unknown = (mark as StoredMark).attrs?.href
  return typeof href === 'string' && !isUnsafeHref(href)
}

function cleanedAttrs({ type, attrs }: JSONContent) {
  if (type === 'heading') return { ...attrs, level: headingLevel(attrs?.level) }
  if (type === 'image') {
    const alt: unknown = attrs?.alt
    return { ...attrs, alt: typeof alt === 'string' ? alt : '' }
  }
  if (type === 'embed') return embedAttrs(attrs) ?? undefined
  return attrs
}

function isSafeNode(node: unknown): node is JSONContent {
  if (!isObject(node)) return false
  const { type, attrs, text } = node as JSONContent
  if (type === 'text') return typeof text === 'string' && text !== ''
  if (type === 'image') return isSafeImageSrc(attrs?.src)
  if (type === 'embed') return embedAttrs(attrs) !== null
  return true
}

function shapeOf({ type }: JSONContent, shape: PresetShape) {
  return typeof type === 'string' && Object.hasOwn(shape.nodes, type)
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

function paragraphsAround(nodes: JSONContent[], shape: PresetShape) {
  const blocks: JSONContent[] = []
  let run: JSONContent[] = []
  const endRun = () => {
    if (run.length > 0) blocks.push({ type: 'paragraph', content: run })
    run = []
  }
  for (const node of nodes) {
    if (isInline(node, shape)) {
      run.push(node)
      continue
    }
    endRun()
    blocks.push(node)
  }
  endRun()
  return blocks
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
      node.type === 'listItem' ? node : { type: 'listItem', content: [node] }
    )
  }
  return blocks.flatMap((node) =>
    node.type === 'listItem' ? (node.content ?? []) : [node]
  )
}

function childrenOf(content: unknown, shape: PresetShape) {
  if (!Array.isArray(content)) return []
  return content.filter(isSafeNode).flatMap((child) => cleaned(child, shape))
}

// JSON skips the schema's parseHTML checks, so stored values are checked here.
// A node the preset doesn't hold gives way to its children, its text in a
// paragraph of its own, which a parent holding inline content unwraps.
function cleaned(node: JSONContent, shape: PresetShape): JSONContent[] {
  const nodeShape = shapeOf(node, shape)
  if (!nodeShape)
    return paragraphsAround(childrenOf(node.content, shape), shape)
  const { marks, content, ...rest } = node
  const attrs = cleanedAttrs(node)
  const holdsContent = Array.isArray(content) && nodeShape.content !== 'none'
  return [
    {
      ...rest,
      ...(attrs && { attrs }),
      ...(Array.isArray(marks) && {
        marks: marks.filter((mark) => isKeptMark(mark, shape))
      }),
      ...(holdsContent && {
        content: fitted(childrenOf(content, shape), nodeShape.content, shape)
      })
    }
  ]
}

/**
 * Brings a stored value up to `CURRENT_VERSION`, in `preset` when given or
 * the value's own preset otherwise. Throws a RangeError on a preset or
 * version this package doesn't know, so a newer value is never read as an
 * older one, and on a value or doc that isn't an object.
 *
 * Every node and mark the preset doesn't hold is dropped, keeping its text:
 * a block's text becomes a paragraph, and a mark's text stays unmarked. So
 * the editor never meets content it can't load. Skips content or marks that
 * aren't a list, any child or mark that isn't an object, and empty text. Drops
 * any link whose href could run script, keeping its text, any image not on
 * https or the same site, and any embed that isn't a provider and id. Reads a
 * heading outside h2 to h4 as the nearest of them, and missing alt text as
 * empty.
 */
export function migrate(
  value: StoredEditorValue,
  preset: Preset = value?.preset as Preset
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
  const [cleanedDoc] = cleaned({ ...doc, type: 'doc' }, presetShapes[preset])
  return { version, preset, doc: cleanedDoc! }
}

export function createEmptyValue(preset: Preset): EditorValue {
  return {
    version: CURRENT_VERSION,
    preset,
    doc: { type: 'doc', content: [{ type: 'paragraph' }] }
  }
}
