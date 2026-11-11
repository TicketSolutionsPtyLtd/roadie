import type { EditorBlock, EditorSection } from '../extensions'
import { type Preset, presetShapes } from '../schema/presetShapes'

// Read from the preset's shape, not its Tiptap schema, so the value a form
// submits before the editor loads keeps exactly what the editor would.

/** Whether a name is one the preset's own nodes or marks use. */
export function presetTakes(preset: Preset, name: string) {
  const { nodes, marks } = presetShapes[preset]
  return Object.hasOwn(nodes, name) || Object.hasOwn(marks, name)
}

/** An app's blocks, only in the preset that takes them. */
export function blocksFor(preset: Preset, blocks: readonly EditorBlock[] = []) {
  if (preset !== 'blocks') return []
  return blocks.filter(({ node }) => !presetTakes(preset, node.name))
}

/** An app's sections, only in the preset that takes them, each name once. */
export function sectionsFor(
  preset: Preset,
  sections: readonly EditorSection[] = [],
  blocks: readonly EditorBlock[] = []
) {
  if (preset !== 'blocks') return []
  const taken = new Set(blocks.map(({ node }) => node.name))
  return sections.filter(({ name }) => {
    if (presetTakes(preset, name) || taken.has(name)) return false
    taken.add(name)
    return true
  })
}

/** The node names of the blocks and sections the preset takes. */
export function customBlockNames(
  preset: Preset,
  blocks?: readonly EditorBlock[],
  sections?: readonly EditorSection[]
) {
  const appBlocks = blocksFor(preset, blocks)
  return [
    ...appBlocks.map(({ node }) => node.name),
    ...sectionsFor(preset, sections, appBlocks).map(({ name }) => name)
  ]
}
