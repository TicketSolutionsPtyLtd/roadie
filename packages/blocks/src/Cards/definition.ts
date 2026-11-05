import type { BlockDefinition } from '../catalogue'
import type { CardsItem, CardsProps } from './index'

const FRAME = [
  'preset',
  'id',
  'intent',
  'emphasis',
  'contained',
  'align',
  'size',
  'eyebrow',
  'title',
  'highlight',
  'description',
  'cards',
  'actions'
] as const

const ACTIONS = { actions: { max: 2 } } as const

export const cardsDefinition = {
  name: 'cards',
  title: 'Cards',
  description:
    'Use it for three or more short, like items side by side, such as benefits, services, steps, or people.',
  group: 'explain',
  keywords: ['grid', 'features', 'steps'],
  presets: [
    {
      name: 'plain',
      title: 'Plain',
      description:
        'Cards of a title and description, with an image, an illustration, or both, for benefits, features, or places to go next.',
      fields: [...FRAME, 'itemEmphasis'],
      itemFields: [
        'title',
        'subtitle',
        'description',
        'image',
        'illustration',
        'href',
        'intent'
      ],
      limits: ACTIONS,
      defaults: { align: 'center' }
    },
    {
      name: 'steps',
      title: 'Steps',
      description:
        'Numbered cards in order, each a title and description, for the steps of how something works.',
      fields: [...FRAME, 'itemEmphasis'],
      itemFields: ['title', 'description', 'image', 'href', 'intent'],
      limits: ACTIONS,
      defaults: { align: 'center' }
    },
    {
      name: 'text-blocks',
      title: 'Text blocks',
      description:
        'Up to four cards in columns, each an image above a title and subtitle set on colour, for services.',
      fields: [...FRAME, 'itemEmphasis'],
      itemFields: [
        'title',
        'subtitle',
        'description',
        'image',
        'illustration',
        'href',
        'intent'
      ],
      limits: { ...ACTIONS, cards: { max: 4 } },
      defaults: { align: 'center' }
    },
    {
      name: 'overlap',
      title: 'Overlap',
      description:
        'Square images, each overlapped by an inverted panel holding an illustration, a marked title, and a description, for industries.',
      fields: FRAME,
      itemFields: [
        'title',
        'subtitle',
        'description',
        'image',
        'illustration',
        'href',
        'intent'
      ],
      limits: ACTIONS,
      defaults: { align: 'center' }
    },
    {
      name: 'photo',
      title: 'Photo',
      description:
        'Square photos on a contained raised surface, each with a title and subtitle marked over it, for people, venues, or events.',
      fields: FRAME,
      itemFields: ['title', 'subtitle', 'image', 'href', 'intent'],
      limits: ACTIONS,
      defaults: { align: 'start', emphasis: 'raised', contained: true }
    },
    {
      name: 'lists',
      title: 'Lists',
      description:
        'Columns of short lists, each under its own title, with no images, for policies, certifications, or other short facts.',
      fields: [...FRAME, 'itemEmphasis'],
      itemFields: ['title', 'points', 'href', 'intent'],
      limits: ACTIONS,
      defaults: { align: 'start' }
    }
  ]
} as const satisfies BlockDefinition<
  keyof CardsProps & string,
  keyof CardsItem & string
>

/** A Cards preset's name. */
export type CardsPreset = (typeof cardsDefinition.presets)[number]['name']
