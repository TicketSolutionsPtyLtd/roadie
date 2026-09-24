import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

export type CalloutEmphasis = 'strong' | 'normal' | 'subtle' | 'subtler'

const tintedParts =
  '**:data-[slot=callout-icon]:text-subtle **:data-[slot=callout-title]:text-strong'

// w-full: a size container has no width from its content, so it would
// collapse in a shrink-to-fit parent.
export const calloutVariants = cva(
  '@container w-full rounded-xl px-4 py-3 text-sm',
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
