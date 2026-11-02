import type { BlockDefinition } from '../catalogue'

export const testimonialDefinition = {
  name: 'testimonial',
  title: 'Testimonial',
  description: 'Lets a client say why they work with Oztix, in their words.',
  presets: [
    {
      name: 'quote',
      title: 'Quote',
      description:
        "One large quote with the person's photo, role and organisation, over an optional background photo.",
      defaults: { align: 'center' }
    },
    {
      name: 'carousel',
      title: 'Carousel',
      description:
        'Several quotes, one at a time, stepped through with dots or a swipe, over an optional background photo.',
      defaults: { align: 'center' }
    }
  ]
} as const satisfies BlockDefinition

export type TestimonialPreset =
  (typeof testimonialDefinition.presets)[number]['name']
