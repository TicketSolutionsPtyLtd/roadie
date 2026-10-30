import type { BlockDefinition } from '../catalogue'

export const statsDefinition = {
  name: 'stats',
  title: 'Stats',
  description:
    'Key numbers as they were written, each with a spot illustration and a label.',
  presets: [
    {
      name: 'figures',
      title: 'Figures',
      description:
        'A heading over a wrapping row of figures, such as company facts, results, or a local audience.',
      variant: 'typed-in'
    }
  ]
} as const satisfies BlockDefinition

/** A Stats preset's name. */
export type StatsPreset = (typeof statsDefinition.presets)[number]['name']
