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
        'A heading over portrait photos that people step through with previous and next controls or a swipe.',
      variant: 'image'
    },
    {
      name: 'marquee',
      title: 'Marquee',
      description:
        'A heading over portrait photos scrolling past in a marquee.',
      variant: 'image'
    }
  ]
} as const satisfies BlockDefinition

export type GalleryPreset = (typeof galleryDefinition.presets)[number]['name']
