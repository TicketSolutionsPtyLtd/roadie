/** What a node holds: blocks, inline content, list items, or nothing. */
export type NodeContent = 'blocks' | 'inline' | 'listItems' | 'none'

export type NodeShape = { inline?: true; content: NodeContent }

export type PresetShape = {
  nodes: Readonly<Record<string, NodeShape>>
  marks: readonly string[]
}

const basicNodes = {
  doc: { content: 'blocks' },
  paragraph: { content: 'inline' },
  text: { inline: true, content: 'none' },
  hardBreak: { inline: true, content: 'none' },
  bulletList: { content: 'listItems' },
  orderedList: { content: 'listItems' },
  listItem: { content: 'blocks' }
} as const satisfies Record<string, NodeShape>

const marks = ['bold', 'italic', 'link'] as const

// Mirrors each preset's Tiptap schema without loading Tiptap, so `migrate`
// runs anywhere; presets.test.ts keeps the two in step.
export const presetShapes = {
  basic: { nodes: basicNodes, marks },
  rich: {
    nodes: {
      ...basicNodes,
      heading: { content: 'inline' },
      blockquote: { content: 'blocks' },
      horizontalRule: { content: 'none' },
      image: { content: 'none' },
      embed: { content: 'none' }
    },
    marks
  }
} as const satisfies Record<string, PresetShape>

export type Preset = keyof typeof presetShapes

export function isPreset(preset: unknown): preset is Preset {
  return typeof preset === 'string' && Object.hasOwn(presetShapes, preset)
}
