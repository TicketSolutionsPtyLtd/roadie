import type { BlockDefinition } from '../catalogue'

export const heroDefinition = {
  name: 'hero',
  title: 'Hero',
  description: "Opens a page with its title, as the page's main heading.",
  presets: [
    {
      name: 'page-hero',
      title: 'Page hero',
      description:
        'A title panel over a photo, beside a video and cycling photos of people and events.',
      variant: 'media'
    },
    {
      name: 'page-header',
      title: 'Page header',
      description: 'An eyebrow and a large title, with no media.',
      variant: 'text'
    }
  ]
} as const satisfies BlockDefinition
