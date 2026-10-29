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
      variant: 'one'
    }
  ]
} as const satisfies BlockDefinition
