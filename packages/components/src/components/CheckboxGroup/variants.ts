import { cva } from 'class-variance-authority'

export const checkboxGroupVariants = cva('flex flex-wrap', {
  variants: {
    direction: {
      vertical: 'flex-col',
      horizontal: 'flex-row gap-4'
    },
    size: {
      sm: '',
      md: '',
      lg: ''
    }
  },
  compoundVariants: [
    { direction: 'vertical', size: 'sm', className: 'gap-0.5' },
    { direction: 'vertical', size: 'md', className: 'gap-1' },
    { direction: 'vertical', size: 'lg', className: 'gap-2' }
  ],
  defaultVariants: {
    direction: 'vertical',
    size: 'md'
  }
})
