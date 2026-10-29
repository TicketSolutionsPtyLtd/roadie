import type { BlockDefinition } from '../catalogue'

export const faqDefinition = {
  name: 'faq',
  title: 'FAQ',
  description: 'Answers the questions people ask before they buy or sign up.',
  presets: [
    {
      name: 'faq',
      title: 'FAQ',
      description: 'A heading over questions that open to their answers.',
      variant: 'accordion'
    }
  ]
} as const satisfies BlockDefinition

export type FAQPreset = (typeof faqDefinition.presets)[number]['name']
