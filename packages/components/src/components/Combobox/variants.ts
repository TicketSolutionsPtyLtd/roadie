import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

export const comboboxInputGroupVariants = cva(
  'inline-flex w-full items-center rounded-lg font-sans',
  {
    variants: {
      intent: intentVariants,
      emphasis: {
        normal: 'emphasis-field is-interactive-field-group',
        subtle:
          'bg-subtle text-normal border border-transparent is-interactive-field-group'
      },
      size: {
        sm: 'min-h-8 px-1.5 text-base [--combobox-chips-py:--spacing(0.75)]',
        md: 'min-h-10 px-2 text-base [--combobox-chips-py:--spacing(1.75)]',
        lg: 'min-h-12 px-2 text-base [--combobox-chips-py:--spacing(2.75)]'
      }
    },
    defaultVariants: {
      emphasis: 'normal',
      size: 'md'
    }
  }
)
