import type { BlockDefinition } from '../catalogue'

export const statsDefinition = {
  name: 'stats',
  title: 'Stats',
  description:
    'Key numbers as they were written, each with a spot illustration and a label.',
  presets: [
    {
      name: 'company-facts',
      title: 'Company facts',
      description:
        'A heading over a wrapping row of numbers, such as tickets sold and organisers served.',
      variant: 'typed-in'
    }
  ]
} as const satisfies BlockDefinition

/** A Stats preset's name. */
export type StatsPreset = (typeof statsDefinition.presets)[number]['name']
