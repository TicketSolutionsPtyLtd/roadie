import type { BlockDefinition } from '../catalogue'
import type { SideBySideProps } from './index'

type Field = keyof SideBySideProps & string

const FRAME = [
  'preset',
  'id',
  'eyebrow',
  'title',
  'highlight',
  'description',
  'body',
  'actions',
  'intent',
  'emphasis',
  'contained',
  'align',
  'size'
] as const satisfies readonly Field[]

const ACTIONS = { actions: { max: 2 } } as const

export const sideBySideDefinition = {
  name: 'side-by-side',
  title: 'Side by side',
  description:
    'Use it for one section with its own title, text, and buttons beside a photo or a few key numbers.',
  group: 'explain',
  presets: [
    {
      name: 'image-start',
      title: 'Image then text',
      description:
        'A photo before a heading, text, and actions, such as a section about a product, a team, or a partnership.',
      fields: [...FRAME, 'image', 'ratio'],
      limits: ACTIONS,
      defaults: { align: 'start', contained: true, ratio: 'landscape' }
    },
    {
      name: 'image-end',
      title: 'Text then image',
      description:
        'A heading, text, and actions before a photo. Stacked with Image then text, it alternates the sides of standalone feature sections.',
      fields: [...FRAME, 'image', 'ratio'],
      limits: ACTIONS,
      defaults: { align: 'start', contained: true, ratio: 'landscape' }
    },
    {
      name: 'stats',
      title: 'Text and stats',
      description:
        'Long-form text beside a column of key numbers, such as a company backing its story with figures.',
      fields: [...FRAME, 'stats'],
      limits: ACTIONS,
      defaults: { align: 'start', contained: true }
    }
  ]
} as const satisfies BlockDefinition<Field>

/** A Side by side preset's name. */
export type SideBySidePreset =
  (typeof sideBySideDefinition.presets)[number]['name']
