import type { BlockDefinition, BlockPreset } from '../catalogue'

/** The preset a block renders: the one named, or the block's first. */
export function presetOf(
  definition: BlockDefinition,
  name: string | undefined
): BlockPreset {
  const preset =
    definition.presets.find((candidate) => candidate.name === name) ??
    definition.presets[0]
  if (!preset) throw new Error(`${definition.name} has no presets`)
  return preset
}
