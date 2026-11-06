import type { MosaicLogoTile, MosaicProps, MosaicTile } from '.'
import { fieldsOf } from '../_shared/shapes'
import type { BlockDefinition } from '../catalogue'

const ACTIONS = { actions: { max: 2 } } as const

export const mosaicDefinition = {
  name: 'mosaic',
  title: 'Mosaic',
  description:
    'Use it to add visual interest with a grid of photo tiles, the large ones first, such as partners, venues, or event types.',
  group: 'prove',
  keywords: ['tiles', 'partners', 'logos'],
  presets: [
    {
      name: 'tiles',
      title: 'Tiles',
      description:
        'Photo tiles, each with a logo or title and a marked label, the wide ones two columns or the full row, then an optional tile of smaller logos.',
      fields: [
        'preset',
        'id',
        'eyebrow',
        'title',
        'highlight',
        'description',
        'tiles',
        'logoTile',
        'actions',
        'intent',
        'emphasis',
        'contained',
        'align',
        'size'
      ],
      itemFields: [
        'title',
        'description',
        'logo',
        'image',
        'size',
        'href',
        'intent'
      ],
      limits: ACTIONS,
      defaults: { align: 'start' }
    }
  ],
  shapes: {
    logoTile: fieldsOf<MosaicLogoTile>()(['title', 'logos'])
  }
} as const satisfies BlockDefinition<
  keyof MosaicProps & string,
  keyof MosaicTile & string
>

export type MosaicPreset = (typeof mosaicDefinition.presets)[number]['name']
