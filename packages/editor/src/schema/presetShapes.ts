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
  attrs?: readonly string[]
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
  }
} as const satisfies Record<string, PresetShape>

export type Preset = keyof typeof presetShapes

export function isPreset(preset: unknown): preset is Preset {
  return typeof preset === 'string' && Object.hasOwn(presetShapes, preset)
}
