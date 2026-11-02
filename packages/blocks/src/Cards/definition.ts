import type { BlockDefinition } from '../catalogue'

export const cardsDefinition = {
  name: 'cards',
  title: 'Cards',
  description:
    'A set of like items, such as benefits, services, steps, values, or people, as cards in columns.',
  presets: [
    {
      name: 'plain',
      title: 'Plain',
      description:
        'Cards of a title and description, with an image, an illustration, or both, for benefits, features, steps, or places to go next. Numbered, they show the steps of how it works.',
      defaults: { align: 'center' }
    },
    {
      name: 'marked',
      title: 'Marked',
      description:
        'Up to four cards in columns, each an image above a marked title and subtitle, for services.',
      defaults: { align: 'center' }
    },
    {
      name: 'overlap',
      title: 'Overlap',
      description:
        'Square images, each overlapped by an inverted panel holding an illustration, a marked title, and a description, for industries.',
      defaults: { align: 'center' }
    },
    {
      name: 'photo',
      title: 'Photo',
      description:
        'Square photos on a contained raised surface, each with a title and subtitle marked over it, for people, venues, or events.',
      defaults: { align: 'start', emphasis: 'raised', contained: true }
    },
    {
      name: 'lists',
      title: 'Lists',
      description:
        'Columns of short lists, each under its own title, with no images, for policies, certifications, or other short facts.',
      defaults: { align: 'start' }
    }
  ]
} as const satisfies BlockDefinition

/** A Cards preset's name. */
export type CardsPreset = (typeof cardsDefinition.presets)[number]['name']
