import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

export const autocompleteInputGroupVariants = cva(
  'inline-flex w-full items-center rounded-lg font-sans',
  {
    variants: {
      intent: intentVariants,
      emphasis: {
        normal:
          'emphasis-sunken border border-subtle is-interactive-field-group',
        subtle:
          'bg-subtle text-normal border border-transparent is-interactive-field-group'
      },
      size: {
        sm: 'h-8 px-1.5 text-base',
        md: 'h-10 px-2 text-base',
        lg: 'h-12 px-2 text-base'
      }
    },
    defaultVariants: {
      emphasis: 'normal',
      size: 'md'
    }
  }
)
