import type { BlockDefinition } from '../catalogue'

export const media = {
  name: 'media',
  title: 'Media',
  description: 'Shows the people and events behind a page in photos.',
  presets: [
    {
      name: 'gallery',
      title: 'Gallery',
      description:
        'A heading over portrait photos scrolling past in a marquee.',
      variant: 'image'
    }
  ]
} as const satisfies BlockDefinition

export type MediaPreset = (typeof media.presets)[number]['name']
