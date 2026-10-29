import type { BlockDefinition } from '../catalogue'

export const galleryDefinition = {
  name: 'gallery',
  title: 'Gallery',
  description: 'Shows the people and events behind a page in photos.',
  presets: [
    {
      name: 'carousel',
      title: 'Carousel',
      description:
        'Portrait photos people step through with controls or a swipe, for a set worth browsing, such as the events partners run.',
      variant: 'image'
    },
    {
      name: 'marquee',
      title: 'Marquee',
      description:
        'Portrait photos scrolling past on their own, with a pause button, for a sense of how many events run with Oztix at a glance.',
      variant: 'image'
    }
  ]
} as const satisfies BlockDefinition

export type GalleryPreset = (typeof galleryDefinition.presets)[number]['name']
