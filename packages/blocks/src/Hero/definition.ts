import type { BlockDefinition } from '../catalogue'

export const heroDefinition = {
  name: 'hero',
  title: 'Hero',
  description: "Opens a page with its title, as the page's main heading.",
  presets: [
    {
      name: 'bento',
      title: 'Bento',
      description:
        'The page hero for landing pages: a title panel over a photo, beside a video and two panels of cycling photos.',
      defaults: { align: 'start' }
    },
    {
      name: 'image',
      title: 'Image',
      description: 'A title beside one photo, for industry and service pages.',
      defaults: { align: 'start' }
    },
    {
      name: 'title',
      title: 'Title',
      description:
        'An eyebrow and a large title, with no media, for a page that opens on its text, such as About or a policy.',
      defaults: { align: 'start' }
    },
    {
      name: 'partner',
      title: 'Partner',
      description:
        "The Oztix and a partner's logos joined by a heart, beside the page title, for a partner page.",
      defaults: { align: 'start' }
    }
  ]
} as const satisfies BlockDefinition

export type HeroPreset = (typeof heroDefinition.presets)[number]['name']
