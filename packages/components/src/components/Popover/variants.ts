import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

export const popoverPopupVariants = cva(
  'grid max-h-[var(--available-height)] max-w-[min(20rem,var(--available-width))] origin-[var(--transform-origin)] gap-4 text-pretty emphasis-floating rounded-xl p-4 motion-scale',
  {
    variants: {
      intent: intentVariants
    }
  }
)
