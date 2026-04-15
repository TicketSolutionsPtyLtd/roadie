import { cva } from 'class-variance-authority'

export const stepsVariants = cva('grid w-full gap-4', {
  variants: {
    direction: {
      horizontal: undefined,
      vertical: 'grid-cols-[auto_1fr] gap-3'
    }
  },
  defaultVariants: {
    direction: 'horizontal'
  }
})
