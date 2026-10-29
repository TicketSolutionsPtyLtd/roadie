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
      name: 'steps',
      title: 'Steps',
      description:
        'Numbered cards for how something works, each a step’s number, title, and description.',
      variant: 'grid'
    },
    {
      name: 'links',
      title: 'Links',
      description:
        'Compact raised cards that each link somewhere, such as contact options, with an illustration, title, and description.',
      variant: 'grid'
    },
    {
      name: 'alternating-rows',
      title: 'Alternating rows',
      description:
        'Rows of a marked title and description beside a square image, alternating sides, for values or the steps of a story.',
      variant: 'list'
    },
    {
      name: 'portraits',
      title: 'Portraits',
      description:
        'Square photos of people, such as the team, speakers, or artists, on a raised surface with each name and role marked over the photo.',
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
