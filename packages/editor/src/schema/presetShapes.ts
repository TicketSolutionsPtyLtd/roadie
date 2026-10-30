/**
 * What a node holds: one or more blocks, a paragraph then blocks, one or more
 * paragraphs, inline content, one or more list items, one or more table rows,
 * table cells, or nothing.
 */
export type NodeContent =
  | 'blocks'
  | 'paragraphFirst'
  | 'paragraphs'
  | 'inline'
  | 'listItems'
  | 'tableRows'
  | 'tableCells'
  | 'none'

export type NodeShape = {
  inline?: true
  content: NodeContent
  /** The attrs it saves, or `stored` for an app's block, which keeps its own. */
  attrs?: readonly string[] | 'stored'
}

export type PresetShape = {
  nodes: Readonly<Record<string, NodeShape>>
  /** Each mark's name and the attrs it saves. */
  marks: Readonly<Record<string, readonly string[]>>
}

const basicNodes = {
  doc: { content: 'blocks' },
  paragraph: { content: 'inline' },
  text: { inline: true, content: 'none' },
  hardBreak: { inline: true, content: 'none' },
  bulletList: { content: 'listItems' },
  orderedList: { content: 'listItems', attrs: ['start', 'type'] },
  listItem: { content: 'paragraphFirst' }
} as const satisfies Record<string, NodeShape>

const marks = {
  bold: [],
  italic: [],
  underline: [],
  link: ['href']
} as const

const richNodes = {
  ...basicNodes,
  heading: { content: 'inline', attrs: ['level'] },
  blockquote: { content: 'blocks' },
  horizontalRule: { content: 'none' },
  image: { content: 'none', attrs: ['src', 'alt'] },
  embed: { content: 'none', attrs: ['provider', 'id', 'params'] },
  table: { content: 'tableRows' },
  tableRow: { content: 'tableCells' },
  tableHeader: { content: 'paragraphs', attrs: ['colspan', 'rowspan'] },
  tableCell: { content: 'paragraphs', attrs: ['colspan', 'rowspan'] }
} as const satisfies Record<string, NodeShape>

/** The attr a block's id saves in; an embed's `id` is its provider's. */
export const BLOCK_ID = 'blockId'

/**
 * The blocks preset's nodes that save a `blockId`. A table moves as one
 * block, so its rows and cells have none; the paragraphs in a cell do.
 */
export const BLOCK_ID_TYPES = [
  'paragraph',
  'heading',
  'blockquote',
  'bulletList',
  'orderedList',
  'listItem',
  'horizontalRule',
  'image',
  'embed',
  'table'
] as const

function withIds(nodes: Record<string, NodeShape>) {
  return Object.fromEntries(
    Object.entries(nodes).map(([name, shape]) => [
      name,
      (BLOCK_ID_TYPES as readonly string[]).includes(name)
        ? { ...shape, attrs: [BLOCK_ID, ...(shape.attrs ?? [])] }
        : shape
    ])
  )
}

// Mirrors each preset's Tiptap schema without loading Tiptap, so `migrate`
// runs anywhere; presets.test.ts keeps the two in step.
export const presetShapes = {
  basic: { nodes: basicNodes, marks },
  rich: { nodes: richNodes, marks },
  blocks: { nodes: withIds(richNodes), marks }
} as const satisfies Record<string, PresetShape>

export type Preset = keyof typeof presetShapes

export function isPreset(preset: unknown): preset is Preset {
  return typeof preset === 'string' && Object.hasOwn(presetShapes, preset)
}
