import type { RichTextProps } from '.'
import type { BlockDefinition } from '../catalogue'

const FRAME = [
  'preset',
  'id',
  'eyebrow',
  'title',
  'highlight',
  'description',
  'body',
  'actions'
] as const

const STYLE = ['intent', 'emphasis', 'contained', 'align', 'size'] as const

export const richTextDefinition = {
  name: 'rich-text',
  title: 'Rich text',
  description:
    'Use it for a short statement between busier sections, or for an article or policy.',
  group: 'explain',
  keywords: ['text', 'statement', 'article'],
  presets: [
    {
      name: 'statement',
      title: 'Statement',
      description:
        'A centred illustration, title, and a few large balanced paragraphs, for a mission or a short belief between busier blocks.',
      fields: [...FRAME, 'illustration', ...STYLE],
      limits: { actions: { max: 2 } },
      defaults: { align: 'center' }
    },
    {
      name: 'long-form',
      title: 'Long form',
      description:
        'Rich text at a reading width with an optional title, such as an article, policy or FAQ answer page.',
      fields: [...FRAME, ...STYLE],
      limits: { actions: { max: 2 } },
      defaults: { align: 'start' }
    }
  ]
} as const satisfies BlockDefinition<keyof RichTextProps & string>

export type RichTextPreset = (typeof richTextDefinition.presets)[number]['name']
