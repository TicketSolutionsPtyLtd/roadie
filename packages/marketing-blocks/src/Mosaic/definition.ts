import type { BlockDefinition } from '../catalogue'

export const mosaicDefinition = {
  name: 'mosaic',
  title: 'Mosaic',
  description:
    'Logos in a grid, as photo tiles with a label or as a strip of logos alone.',
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

export type MosaicPreset = (typeof mosaicDefinition.presets)[number]['name']
