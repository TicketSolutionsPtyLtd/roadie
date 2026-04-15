import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

export const selectTriggerVariants = cva(
  'inline-flex w-full items-center justify-between rounded-lg font-sans select-none cursor-pointer text-left data-[popup-open]:bg-[var(--color-accent-2)] data-[popup-open]:border-[var(--color-accent-9)] data-[popup-open]:outline-[length:var(--focus-ring-width)]',
  {
    variants: {
      intent: intentVariants,
      emphasis: {
        normal: 'emphasis-raised border border-normal is-interactive-field',
        subtle:
          'bg-subtle text-normal border border-transparent is-interactive-field'
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
