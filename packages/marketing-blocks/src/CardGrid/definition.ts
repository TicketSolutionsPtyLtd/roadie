import type { BlockDefinition } from '../catalogue'

export const cardGridDefinition = {
  name: 'card-grid',
  title: 'Card grid',
  description:
    'A set of like items, such as benefits, services, values, or people, as cards in columns or rows.',
  presets: [
    {
      name: 'features',
      title: 'Features',
      description:
        'Three benefits on a raised surface, each an image with an illustration, a title, and a description.',
      variant: 'grid'
    },
    {
      name: 'services',
      title: 'Services',
      description:
        'Up to four services in columns, each an image above a marked title and subtitle.',
      variant: 'grid'
    },
    {
      name: 'industries',
      title: 'Industries',
      description:
        'Square images, each with a dark panel holding an illustration, a marked title, and a description.',
      variant: 'grid'
    },
    {
      name: 'values',
      title: 'Values',
      description:
        'Rows of a marked title and description beside a square image, alternating sides.',
      variant: 'list'
    },
    {
      name: 'team',
      title: 'Team',
      description:
        'Square photos on a raised surface, with each name and role marked over the photo.',
      variant: 'grid'
    },
    {
      name: 'lists',
      title: 'Lists',
      description:
        'Columns of short lists, each under its own title, with no images.',
      variant: 'grid'
    }
  ]
} as const satisfies BlockDefinition
