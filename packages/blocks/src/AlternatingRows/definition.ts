import type { BlockDefinition } from '../catalogue'
import type { AlternatingRow, AlternatingRowsProps } from './index'

const ACTIONS = { actions: { max: 2 } } as const

export const alternatingRowsDefinition = {
  name: 'alternating-rows',
  title: 'Alternating rows',
  description:
    'Use it for three to six values or story steps, each a sentence or two with a photo.',
  group: 'explain',
  presets: [
    {
      name: 'text-blocks',
      title: 'Text blocks',
      description:
        'Rows of a title set on a colour, a subtitle, and a sentence or two beside a square photo, alternating sides, for values or the steps of a story.',
      fields: [
        'preset',
        'id',
        'eyebrow',
        'title',
        'highlight',
        'description',
        'rows',
        'actions',
        'intent',
        'emphasis',
        'contained',
        'itemEmphasis',
        'align',
        'size'
      ],
      itemFields: [
        'title',
        'subtitle',
        'description',
        'image',
        'href',
        'intent'
      ],
      limits: { ...ACTIONS, rows: { min: 3, max: 6 } },
      defaults: { align: 'start' }
    }
  ]
} as const satisfies BlockDefinition<
  keyof AlternatingRowsProps & string,
  keyof AlternatingRow & string
>

/** An Alternating rows preset's name. */
export type AlternatingRowsPreset =
  (typeof alternatingRowsDefinition.presets)[number]['name']
