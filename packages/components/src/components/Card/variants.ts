import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

export const cardVariants = cva('grid content-start rounded-xl group/card', {
  variants: {
    intent: intentVariants,
    emphasis: {
      raised: 'emphasis-raised',
      subtle: 'emphasis-subtle',
      subtler: 'emphasis-subtler p-2 gap-4 -m-2',
      normal: 'emphasis-normal'
    }
  },
  defaultVariants: {
    emphasis: 'normal'
  }
})
