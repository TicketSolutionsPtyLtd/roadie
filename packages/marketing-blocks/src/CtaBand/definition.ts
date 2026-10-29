import type { BlockDefinition } from '../catalogue'

export const ctaBand = {
  name: 'cta-band',
  title: 'CTA band',
  description: 'Closes a page with a short pitch and the next step to take.',
  presets: [
    {
      name: 'studio-cta',
      title: 'Studio CTA',
      description:
        'A raised panel with the pitch and actions beside a tilted photo that breaks out of its top.',
      variant: 'split'
    },
    {
      name: 'talk-to-us',
      title: 'Talk to us',
      description: 'A raised panel with the pitch and actions centred.',
      variant: 'centred'
    }
  ]
} as const satisfies BlockDefinition

export type CtaBandPreset = (typeof ctaBand.presets)[number]['name']
