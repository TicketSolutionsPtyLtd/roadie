import type { BlockDefinition } from '../catalogue'

export const cardGridDefinition = {
  name: 'card-grid',
  title: 'Card grid',
  description:
    'A set of like items, such as benefits, services, values, or people, as cards in columns or rows.',
  presets: [
    {
      name: 'illustrated-cards',
      title: 'Illustrated cards',
      description:
        'Cards on a raised surface, each an image with an illustration over it, a title, and a description, for benefits or features.',
      variant: 'grid'
    },
    {
      name: 'marked-cards',
      title: 'Marked cards',
      description:
        'Up to four cards in columns, each an image above a marked title and subtitle, for services.',
      variant: 'grid'
    },
    {
      name: 'overlap-cards',
      title: 'Overlap cards',
      description:
        'Square images, each overlapped by a dark panel holding an illustration, a marked title, and a description, for industries.',
      variant: 'grid'
    },
    {
      name: 'numbered-cards',
      title: 'Numbered cards',
      description:
        'Cards numbered in order, each a number, title, and description, for how it works.',
      variant: 'grid'
    },
    {
      name: 'link-cards',
      title: 'Link cards',
      description:
        'Compact raised cards that each link somewhere, with an illustration, title, and description, for contact options or browse links.',
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
        'Square photos on an inset raised surface, each with a name and role marked over it, for the team, speakers, or artists.',
      variant: 'grid'
    },
    {
      name: 'lists',
      title: 'Lists',
      description:
        'Columns of short lists, each under its own title, with no images, for policies, certifications, or other short facts.',
      variant: 'grid'
    }
  ]
} as const satisfies BlockDefinition

/** A CardGrid preset's name. */
export type CardGridPreset = (typeof cardGridDefinition.presets)[number]['name']
