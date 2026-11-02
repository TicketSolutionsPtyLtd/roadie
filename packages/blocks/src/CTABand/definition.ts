import type { BlockDefinition } from '../catalogue'

export const ctaBandDefinition = {
  name: 'cta-band',
  title: 'CTA band',
  description: 'Closes a page with a short pitch and the next step to take.',
  presets: [
    {
      name: 'band',
      title: 'Band',
      description:
        'A pitch and its actions on a panel: beside a tilted photo that breaks out of the top, such as the Studio CTA, or centred without one, such as “Talk to us”.',
      variant: 'band',
      defaults: { emphasis: 'raised' }
    }
  ]
} as const satisfies BlockDefinition

export type CTABandPreset = (typeof ctaBandDefinition.presets)[number]['name']
