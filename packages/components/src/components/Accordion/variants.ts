import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

export const accordionVariants = cva('grid w-full', {
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
})
