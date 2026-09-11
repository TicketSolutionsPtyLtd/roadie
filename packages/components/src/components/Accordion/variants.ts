import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

export const accordionVariants = cva(
  'grid w-full [--content-inset:--spacing(4)]',
  {
    variants: {
      intent: intentVariants,
      emphasis: {
        normal:
          'emphasis-normal rounded-xl [&>*+*]:border-t [&>*+*]:border-subtle',
        subtle: 'gap-0.5',
        subtler: ''
      }
    },
    defaultVariants: {
      emphasis: 'normal'
    }
  }
)
