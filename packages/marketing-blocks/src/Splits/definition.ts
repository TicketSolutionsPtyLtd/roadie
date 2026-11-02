import type { BlockDefinition } from '../catalogue'

export const splitsDefinition = {
  name: 'splits',
  title: 'Splits',
  description:
    'A list of like items, such as values or the steps of a story, as rows of text beside an image that alternate sides.',
  presets: [
    {
      name: 'marked',
      title: 'Marked',
      description:
        'Rows of a marked title, subtitle, and description beside a square image, alternating sides, for values or the steps of a story.',
      variant: 'rows',
      defaults: { align: 'start' }
    }
  ]
} as const satisfies BlockDefinition

/** A Splits preset's name. */
export type SplitsPreset = (typeof splitsDefinition.presets)[number]['name']
