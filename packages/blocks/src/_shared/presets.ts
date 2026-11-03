import type { BlockDefinition } from '../catalogue'

/** The preset a block renders: the one named, or the block's first. */
export function presetOf<Definition extends BlockDefinition>(
  definition: Definition,
  name: string | undefined
): Definition['presets'][number] {
  const preset =
    definition.presets.find((candidate) => candidate.name === name) ??
    definition.presets[0]
  if (!preset) throw new Error(`${definition.name} has no presets`)
  return preset
}
