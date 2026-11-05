import type { BlockDefinition } from '../catalogue'
import { withoutInvisible } from './highlight'

/** The preset a block renders: the one named, or the block's first. */
export function presetOf<Definition extends BlockDefinition>(
  definition: Definition,
  name: string | undefined
): Definition['presets'][number] {
  const wanted = name && withoutInvisible(name)
  const named = definition.presets.find(
    (candidate) => candidate.name === wanted
  )
  if (wanted && !named) warnUnknown(definition, wanted)
  const preset = named ?? definition.presets[0]
  if (!preset) throw new Error(`${definition.name} has no presets`)
  return preset
}

const warned = new Set<string>()

function warnUnknown(definition: BlockDefinition, name: string) {
  if (typeof process === 'undefined' || process.env?.NODE_ENV === 'production')
    return
  const key = `${definition.name}/${name}`
  if (warned.has(key)) return
  warned.add(key)
  const known = definition.presets.map((preset) => preset.name).join(', ')
  console.warn(
    `${definition.name} has no preset "${name}", so it renders ${definition.presets[0]?.name}. Its presets are ${known}.`
  )
}
