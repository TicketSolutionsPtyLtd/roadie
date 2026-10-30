import type { BlockDefinition } from '../catalogue'

export const ctaBandDefinition = {
  name: 'cta-band',
  title: 'CTA band',
  description: 'Closes a page with a short pitch and the next step to take.',
  presets: [
    {
      name: 'with-photo',
      title: 'With photo',
      description:
        'A pitch beside a tilted photo, such as the Studio CTA or “List your events”.',
      variant: 'split'
    },
    {
      name: 'centred',
      title: 'Centred',
      description: 'A short centred pitch, such as “Talk to us”.',
      variant: 'centred'
    }
  ]
} as const satisfies BlockDefinition

export type CTABandPreset = (typeof ctaBandDefinition.presets)[number]['name']
