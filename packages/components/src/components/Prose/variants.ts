import { cva } from 'class-variance-authority'

export const proseVariants = cva('prose', {
  variants: {
    size: {
      sm: 'prose-sm',
      md: '',
      lg: 'prose-lg'
    }
  },
  defaultVariants: {
    size: 'md'
  }
})
