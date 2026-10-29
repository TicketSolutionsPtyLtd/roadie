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

// A span of 1 is the default, so only a wider one is written.
const isSpan = (span: unknown) => Number.isInteger(span) && Number(span) > 1

function cellOf(tag: 'th' | 'td') {
  return ({ colspan, rowspan }: SavedAttrs): Element => ({
    tag,
    attrs: {
      ...(isSpan(colspan) && { colspan: colspan as number }),
      ...(isSpan(rowspan) && { rowspan: rowspan as number })
    }
  })
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
  embed,
  table: () => ({ tag: 'table' }),
  tableRow: () => ({ tag: 'tr' }),
  tableHeader: cellOf('th'),
  tableCell: cellOf('td'),
  // An email's layout renders with renderEmail; on a page its text flows, and a
  // button is its link.
  section: () => null,
  columns: () => null,
  column: () => null,
  button: link
}

// Nodes `withTableSections` adds around a saved table's rows, never saved.
const TABLE_PARTS: Record<string, ToElement> = {
  tableScroll: () => ({ tag: 'div', attrs: { class: 'prose-scroll' } }),
  tableHead: () => ({ tag: 'thead' }),
  tableBody: () => ({ tag: 'tbody' })
}

const MARKS: Record<string, ToElement> = {
  bold: () => ({ tag: 'strong' }),
  italic: () => ({ tag: 'em' }),
  underline: () => ({ tag: 'u' }),
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
  const nodes = known(NODES, Object.keys(schema.nodes))
  return {
    nodes: nodes.table ? Object.assign(nodes, TABLE_PARTS) : nodes,
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

// A thead clips a rowspan at its end, so a row that spans down stays in the
// tbody.
const isHeaderRow = (row: JSONContent | undefined) =>
  row?.content?.every(
    (cell) => cell.type === 'tableHeader' && !(Number(cell.attrs?.rowspan) > 1)
  ) === true

function tableSections(rows: JSONContent[]): JSONContent[] {
  const [first, ...body] = rows
  const head = isHeaderRow(first) ? [first!] : []
  const bodyRows = head.length > 0 ? body : rows
  return [
    ...(head.length > 0 ? [{ type: 'tableHead', content: head }] : []),
    ...(bodyRows.length > 0 ? [{ type: 'tableBody', content: bodyRows }] : [])
  ]
}

/**
 * Puts a header first row in a `thead`, unless a cell in it spans more than
 * one row, and the rest in a `tbody`, and each table in a `.prose-scroll`,
 * so a wide one scrolls rather than widening the page.
 */
export function withTableSections(node: JSONContent): JSONContent {
  const content = node.content?.map(withTableSections)
  if (node.type !== 'table') return content ? { ...node, content } : node
  return {
    type: 'tableScroll',
    content: [{ ...node, content: tableSections(content ?? []) }]
  }
}
