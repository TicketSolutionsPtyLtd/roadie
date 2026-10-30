import type { BlockDefinition } from '../catalogue'

export const cardGridDefinition = {
  name: 'card-grid',
  title: 'Card grid',
  description:
    'A set of like items, such as benefits, services, steps, values, or people, as cards in columns.',
  presets: [
    {
      name: 'cards',
      title: 'Cards',
      description:
        'Cards of a title and description, with an image, an illustration, or both, for benefits, features, steps, or places to go next. Numbered, they show the steps of how it works.',
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
        'Square images, each overlapped by a raised panel holding an illustration, a marked title, and a description, for industries.',
      variant: 'grid'
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
