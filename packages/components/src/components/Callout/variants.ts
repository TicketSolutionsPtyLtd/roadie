import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

export type CalloutEmphasis = 'strong' | 'normal' | 'subtle' | 'subtler'

const tintedParts =
  '**:data-[slot=callout-icon]:text-subtle **:data-[slot=callout-title]:text-strong'

// A container can't query itself, so the tracks stay fixed and the parts move
// with @container. Parts space themselves with margins, not gap: an absent
// part's empty track would still take a gap.
export const calloutVariants = cva(
  '@container grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-start rounded-xl px-4 py-3 text-sm',
  {
    variants: {
      intent: intentVariants,
      emphasis: {
        strong: 'emphasis-strong',
        normal: `emphasis-normal ${tintedParts}`,
        subtle: `emphasis-subtle ${tintedParts}`,
        subtler: `emphasis-subtler ${tintedParts}`
      }
    },
    defaultVariants: {
      emphasis: 'subtle'
    }
  }
)
