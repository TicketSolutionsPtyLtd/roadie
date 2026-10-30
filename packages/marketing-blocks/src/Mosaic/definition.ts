import type { BlockDefinition } from '../catalogue'

export const mosaicDefinition = {
  name: 'mosaic',
  title: 'Mosaic',
  description:
    'Partners in a grid of photo tiles, each with a logo and a marked label.',
  presets: [
    {
      name: 'tiers',
      title: 'Tiers',
      description:
        'Photo tiles with a logo and a level, the large ones two columns wide, such as partner tiers.',
      variant: 'static'
    }
  ]
} as const satisfies BlockDefinition

export type MosaicPreset = (typeof mosaicDefinition.presets)[number]['name']
