import type { BlockDefinition } from '../catalogue'

export const mosaicDefinition = {
  name: 'mosaic',
  title: 'Mosaic',
  description:
    'A dense grid of photo tiles, each with a logo and a label, some twice as wide.',
  presets: [
    {
      name: 'tiers',
      title: 'Tiers',
      description:
        'Photo tiles with a logo and a level, the wider ones featured, such as partner tiers.',
      variant: 'static'
    },
    {
      name: 'logo-strip',
      title: 'Logo strip',
      description:
        'A wrapping, centred row of logos at one height, with no photos, such as partners or certifications.',
      variant: 'static'
    }
  ]
} as const satisfies BlockDefinition
