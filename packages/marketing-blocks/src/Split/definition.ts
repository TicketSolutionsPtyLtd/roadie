import type { BlockDefinition } from '../catalogue'

export const splitDefinition = {
  name: 'split',
  title: 'Split',
  description:
    'Text beside an image, a partner lockup, or the numbers that back it up.',
  presets: [
    {
      name: 'tinted-panel',
      title: 'Tinted panel',
      description:
        'An image beside a heading on a tinted panel, such as a team or feature highlight.',
      variant: 'media'
    },
    {
      name: 'media-text',
      title: 'Media and text',
      description:
        'A plain image beside a heading, text, and actions, with no panel, such as a section about a product or partnership.',
      variant: 'media'
    },
    {
      name: 'text-and-stats',
      title: 'Text and stats',
      description:
        'Long-form text with a column of key figures beside it, such as an about page backing its story with numbers. The figures wrap below on narrow screens.',
      variant: 'stats'
    },
    {
      name: 'logo-lockup',
      title: 'Logo lockup',
      description:
        "The Oztix and a partner's logos joined by a heart, beside the page title, for a partner page.",
      variant: 'media'
    }
  ]
} as const satisfies BlockDefinition

/** A Split preset's name. */
export type SplitPreset = (typeof splitDefinition.presets)[number]['name']
