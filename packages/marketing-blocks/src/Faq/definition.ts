import type { BlockDefinition } from '../catalogue'

export const faq = {
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

export type FaqPreset = (typeof faq.presets)[number]['name']
