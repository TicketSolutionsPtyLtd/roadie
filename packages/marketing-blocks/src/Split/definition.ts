import type { BlockDefinition } from '../catalogue'

export const splitDefinition = {
  name: 'split',
  title: 'Split',
  description:
    'Text beside an image or the numbers that back it up, or rows of text and images that alternate sides.',
  presets: [
    {
      name: 'media-text',
      title: 'Media and text',
      description:
        'An image, or a column of key figures, beside a heading, text, and actions, such as a section about a product, a team, or a company backing its story with numbers.',
      variant: 'media',
      defaults: { align: 'start', contained: true }
    },
    {
      name: 'alternating-rows',
      title: 'Alternating rows',
      description:
        'Rows of a marked title and description beside a square image, alternating sides, for values or the steps of a story.',
      variant: 'rows',
      defaults: { align: 'start' }
    }
  ]
} as const satisfies BlockDefinition

/** A Split preset's name. */
export type SplitPreset = (typeof splitDefinition.presets)[number]['name']
