import { cva } from 'class-variance-authority'

export const checkboxGroupVariants = cva('flex flex-wrap', {
  variants: {
    direction: {
      vertical: 'flex-col gap-2',
      horizontal: 'flex-row gap-4'
    }
  },
  defaultVariants: {
    direction: 'vertical'
  }
})
