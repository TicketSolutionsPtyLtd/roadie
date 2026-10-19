import { type Extensions, type JSONContent, getSchema } from '@tiptap/core'

import { isUnsafeHref } from '@oztix/roadie-core/utils'

import { type EmbedProvider, type Preset, presets } from '../schema'
import { headingLevel } from '../schema/headings'
import { isSafeImageSrc } from '../schema/imageSrc'
import { EMBED_ALLOW, EMBED_SANDBOX, embedFrame } from './embedFrame'

export type SavedAttrs = Record<string, unknown>

export type Element = {
  tag: string
  attrs?: Record<string, string | number>
  /** CSS properties in camelCase, as React takes them. */
  style?: Record<string, string>
}

export type RenderContext = {
  embedProviders: readonly EmbedProvider[] | undefined
}

/** Turns a node's or mark's saved attrs into its element, or `null` to render its children alone. */
type ToElement = (attrs: SavedAttrs, context: RenderContext) => Element | null

export type Elements = {
  nodes: Record<string, ToElement>
  marks: Record<string, ToElement>
}

const ORDERED_LIST_TYPES = new Set(['1', 'a', 'A', 'i', 'I'])

function orderedList({ start, type }: SavedAttrs): Element {
  const hasStart = Number.isInteger(start) && start !== 1
  const hasType = typeof type === 'string' && ORDERED_LIST_TYPES.has(type)
  return {
    tag: 'ol',
    attrs: {
      ...(hasStart && { start: start as number }),
      ...(hasType && { type })
    }
  }
}

function link({ href }: SavedAttrs): Element | null {
  return typeof href === 'string' && !isUnsafeHref(href)
    ? { tag: 'a', attrs: { href } }
    : null
}

function image({ src, alt }: SavedAttrs): Element | null {
  if (!isSafeImageSrc(src)) return null
  return {
    tag: 'img',
    attrs: { src, alt: typeof alt === 'string' ? alt : '', loading: 'lazy' }
  }
}

function embed(attrs: SavedAttrs, { embedProviders }: RenderContext) {
  const frame = embedFrame(attrs, embedProviders)
  if (!frame) return null
  return {
    tag: 'iframe',
    attrs: {
      src: frame.src,
      title: frame.title,
      loading: 'lazy',
      sandbox: EMBED_SANDBOX,
      allow: EMBED_ALLOW
    },
    style: frame.style
  }
}

// Each saved node and mark the renderers know, by Tiptap's name. Attributes
// are read one by one, so nothing else in a saved value reaches the output.
// `text` is each renderer's own, since it escapes differently.
const NODES: Record<string, ToElement> = {
  doc: () => null,
  paragraph: () => ({ tag: 'p' }),
  hardBreak: () => ({ tag: 'br' }),
  bulletList: () => ({ tag: 'ul' }),
  orderedList,
  listItem: () => ({ tag: 'li' }),
  heading: ({ level }) => ({ tag: `h${headingLevel(level)}` }),
  blockquote: () => ({ tag: 'blockquote' }),
  horizontalRule: () => ({ tag: 'hr' }),
  image,
  embed
}

const MARKS: Record<string, ToElement> = {
  bold: () => ({ tag: 'strong' }),
  italic: () => ({ tag: 'em' }),
  link
}

export const VOID_TAGS = new Set(['br', 'hr', 'img'])

// Null prototypes, so a saved type such as `constructor` finds nothing.
function known(table: Record<string, ToElement>, names: readonly string[]) {
  const kept: Record<string, ToElement> = Object.create(null)
  for (const name of names)
    if (Object.hasOwn(table, name)) kept[name] = table[name]!
  return kept
}

function elementsFor(extensions: Extensions): Elements {
  const schema = getSchema(extensions)
  return {
    nodes: known(NODES, Object.keys(schema.nodes)),
    marks: known(MARKS, Object.keys(schema.marks))
  }
}

const presetElements = new Map<Preset, Elements>()

/** The elements a preset's schema allows, so a node outside it is dropped. */
export function presetElementsFor(preset: Preset): Elements {
  let elements = presetElements.get(preset)
  if (!elements) {
    elements = elementsFor(presets[preset])
    presetElements.set(preset, elements)
  }
  return elements
}

/**
 * Saved marks list the outermost first, as ProseMirror writes them, but the
 * static renderer wraps the first innermost, so this flips them to match the
 * editor's nesting.
 */
export function outermostMarksLast(node: JSONContent): JSONContent {
  return {
    ...node,
    ...(Array.isArray(node.marks) && { marks: [...node.marks].reverse() }),
    ...(Array.isArray(node.content) && {
      content: node.content.map(outermostMarksLast)
    })
  }
}
