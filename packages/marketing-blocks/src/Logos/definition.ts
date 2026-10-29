import type { BlockDefinition } from '../catalogue'

export const logosDefinition = {
  name: 'logos',
  title: 'Logos',
  description:
    'Shows the organisations behind Oztix, as logo tiles over their photos.',
  presets: [
    {
      name: 'partner-tiers',
      title: 'Partner tiers',
      description:
        "Each partner's logo over a photo with its level, featured partners wider, then the others supporting.",
      variant: 'static'
    }
  ]
} as const satisfies BlockDefinition
