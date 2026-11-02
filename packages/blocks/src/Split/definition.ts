import type { BlockDefinition } from '../catalogue'

export const splitDefinition = {
  name: 'split',
  title: 'Split',
  description:
    'A section of text beside an image, or beside the numbers that back it up.',
  presets: [
    {
      name: 'image-start',
      title: 'Image then text',
      description:
        'An image before a heading, text, and actions, such as a section about a product, a team, or a partnership.',
      defaults: { align: 'start', contained: true }
    },
    {
      name: 'image-end',
      title: 'Text then image',
      description:
        'A heading, text, and actions before an image. Stacked with image-start, it alternates the sides of standalone feature sections.',
      defaults: { align: 'start', contained: true }
    },
    {
      name: 'stats',
      title: 'Text and stats',
      description:
        'Long-form text beside a column of key figures, such as a company backing its story with numbers.',
      defaults: { align: 'start', contained: true }
    }
  ]
} as const satisfies BlockDefinition

/** A Split preset's name. */
export type SplitPreset = (typeof splitDefinition.presets)[number]['name']
