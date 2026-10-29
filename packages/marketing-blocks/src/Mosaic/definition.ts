import type { BlockDefinition } from '../catalogue'

export const mosaicDefinition = {
  name: 'mosaic',
  title: 'Mosaic',
  description:
    'A dense grid of photo tiles, each with a logo and a label, some twice as wide.',
  presets: [
    {
      name: 'partner-tiers',
      title: 'Partner tiers',
      description:
        "Each partner's logo over a photo with its level, featured partners wider, then the others supporting.",
      variant: 'static'
    }
  ]
} as const satisfies BlockDefinition
