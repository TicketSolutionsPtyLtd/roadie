import type { BlockDefinition } from '../catalogue'

export const galleryDefinition = {
  name: 'gallery',
  title: 'Gallery',
  description:
    'Shows the people, events, and partners behind a page in photos or logos.',
  presets: [
    {
      name: 'carousel',
      title: 'Carousel',
      description:
        'Portrait photos people step through with controls or a swipe, for a set worth browsing, such as the events partners run.',
      variant: 'image',
      defaults: { align: 'start' }
    },
    {
      name: 'marquee',
      title: 'Marquee',
      description:
        'Portrait photos scrolling past on their own, with a pause button, for a sense of how many events run with Oztix at a glance.',
      variant: 'image',
      defaults: { align: 'center' }
    },
    {
      name: 'wrap',
      title: 'Wrap',
      description:
        'Images in a wrapping, centred row, such as partner logos or certifications at their own proportions.',
      variant: 'image',
      defaults: { align: 'center' }
    }
  ]
} as const satisfies BlockDefinition

export type GalleryPreset = (typeof galleryDefinition.presets)[number]['name']
