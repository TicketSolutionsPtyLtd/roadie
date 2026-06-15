import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

export const dialogPopupVariants = cva(
  'grid w-full gap-8 emphasis-floating rounded-2xl p-6 motion-slide',
  {
    variants: {
      intent: intentVariants,
      size: {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg'
      }
    },
    defaultVariants: {
      size: 'md'
    }
  }
)
