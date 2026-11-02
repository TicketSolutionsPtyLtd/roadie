import type { TestimonialProps, TestimonialQuote } from '.'
import type { BlockDefinition } from '../catalogue'

const FIELDS = [
  'preset',
  'id',
  'eyebrow',
  'title',
  'highlight',
  'description',
  'quotes',
  'image',
  'actions',
  'intent',
  'emphasis',
  'contained',
  'align',
  'size'
] as const

const ITEM_FIELDS = ['quote', 'person', 'organisation'] as const

const ACTIONS = { actions: { max: 2 } } as const

export const testimonialDefinition = {
  name: 'testimonial',
  title: 'Testimonial',
  description:
    'Use it to let a client say, in their words, why they work with Oztix.',
  group: 'prove',
  presets: [
    {
      name: 'quote',
      title: 'Quote',
      description:
        "One large quote with the person's portrait, role, and organisation, over an optional background photo.",
      fields: FIELDS,
      itemFields: ITEM_FIELDS,
      limits: { ...ACTIONS, quotes: { min: 1, max: 1, strict: true } },
      defaults: { align: 'center' }
    },
    {
      name: 'carousel',
      title: 'Carousel',
      description:
        'Two or more quotes, one at a time, stepped through with dots or a swipe, over an optional background photo.',
      fields: FIELDS,
      itemFields: ITEM_FIELDS,
      limits: { ...ACTIONS, quotes: { min: 2, strict: true } },
      defaults: { align: 'center' }
    }
  ]
} as const satisfies BlockDefinition<
  keyof TestimonialProps & string,
  keyof TestimonialQuote & string
>

export type TestimonialPreset =
  (typeof testimonialDefinition.presets)[number]['name']
