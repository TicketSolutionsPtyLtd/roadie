import type { BlockDefinition } from '../catalogue'

export const splitDefinition: BlockDefinition = {
  name: 'split',
  title: 'Split',
  description:
    'Text beside an image, a partner lockup, or the numbers that back it up.',
  presets: [
    {
      name: 'feature-row',
      title: 'Feature row',
      description:
        'An image beside a heading and short description, on a tinted panel.',
      variant: 'media'
    },
    {
      name: 'text-and-stats',
      title: 'Text and stats',
      description:
        'Long-form text with a column of key numbers beside it, which wraps below on narrow screens.',
      variant: 'stats'
    },
    {
      name: 'partner-spotlight',
      title: 'Partner spotlight',
      description:
        "Opens a partner page: the Oztix logo and the partner's logo joined by a heart, beside the page title, text, and action.",
      variant: 'media'
    }
  ]
}
