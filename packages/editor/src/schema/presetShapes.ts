/**
 * What a node holds: one or more blocks, a paragraph then blocks, one or more
 * paragraphs, inline content, one or more list items, one or more table rows,
 * table cells, two to four columns, or nothing.
 */
export type NodeContent =
  | 'blocks'
  | 'paragraphFirst'
  | 'paragraphs'
  | 'inline'
  | 'listItems'
  | 'tableRows'
  | 'tableCells'
  | 'columns'
  | 'none'

export type NodeShape = {
  inline?: true
  content: NodeContent
  attrs?: readonly string[]
  /**
   * The blocks a node holding blocks may hold, when not every block. Any
   * other gives way to its children.
   */
  holds?: readonly string[]
  /** Inline content with no marks: text, and the preset's variables. */
  plainText?: true
}

export type PresetShape = {
  nodes: Readonly<Record<string, NodeShape>>
  /** Each mark's name and the attrs it saves. */
  marks: Readonly<Record<string, readonly string[]>>
  /** Images load only over https, never from a path on the site. */
  httpsImages?: true
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

const textBlocks = ['paragraph', 'heading', 'bulletList', 'orderedList']
const emailBlocks = [
  ...textBlocks,
  'button',
  'image',
  'spacer',
  'horizontalRule'
]

const marks = {
  bold: [],
  italic: [],
  underline: [],
  link: ['href']
} as const

// Mirrors each preset's Tiptap schema without loading Tiptap, so `migrate`
// runs anywhere; presets.test.ts keeps the two in step.
export const presetShapes = {
  basic: { nodes: basicNodes, marks },
  rich: {
    nodes: {
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
    },
    marks
  },
  email: {
    nodes: {
      ...basicNodes,
      doc: { content: 'blocks', holds: [...emailBlocks, 'section', 'columns'] },
      listItem: { content: 'paragraphFirst', holds: textBlocks },
      heading: { content: 'inline', attrs: ['level'] },
      section: {
        content: 'blocks',
        attrs: ['showWhen'],
        holds: [...emailBlocks, 'columns']
      },
      columns: { content: 'columns' },
      column: { content: 'blocks', holds: emailBlocks },
      button: {
        content: 'inline',
        attrs: ['href', 'showWhen'],
        plainText: true
      },
      image: { content: 'none', attrs: ['src', 'alt', 'width', 'showWhen'] },
      spacer: { content: 'none', attrs: ['height', 'showWhen'] },
      horizontalRule: { content: 'none', attrs: ['showWhen'] },
      variable: { inline: true, content: 'none', attrs: ['key', 'fallback'] }
    },
    marks,
    httpsImages: true
  }
} as const satisfies Record<string, PresetShape>

export type Preset = keyof typeof presetShapes

export function isPreset(preset: unknown): preset is Preset {
  return typeof preset === 'string' && Object.hasOwn(presetShapes, preset)
}
