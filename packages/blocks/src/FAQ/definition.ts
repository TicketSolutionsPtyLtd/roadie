import type { BlockDefinition } from '../catalogue'
import type { FAQItem, FAQProps } from './index'

const ACTIONS = { actions: { max: 2 } } as const

export const faqDefinition = {
  name: 'faq',
  title: 'FAQ',
  description:
    'Use it for the questions people ask before they buy or sign up.',
  group: 'explain',
  keywords: ['questions', 'accordion', 'help'],
  presets: [
    {
      name: 'accordion',
      title: 'Accordion',
      description: 'Questions that open to their answers one at a time.',
      fields: [
        'preset',
        'id',
        'eyebrow',
        'title',
        'highlight',
        'description',
        'questions',
        'actions',
        'intent',
        'emphasis',
        'contained',
        'itemEmphasis',
        'align',
        'size'
      ],
      itemFields: ['question', 'answer'],
      limits: ACTIONS,
      defaults: { align: 'start', itemEmphasis: 'subtler' }
    }
  ]
} as const satisfies BlockDefinition<
  keyof FAQProps & string,
  keyof FAQItem & string
>

export type FAQPreset = (typeof faqDefinition.presets)[number]['name']
