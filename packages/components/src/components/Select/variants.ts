import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

const fieldOpen =
  'is-interactive-field data-[popup-open]:bg-(--field-focus-bg) data-[popup-open]:border-[var(--color-accent-9)] data-[popup-open]:outline-[length:var(--focus-ring-width)]'

export const selectTriggerVariants = cva(
  'inline-flex max-w-full min-w-0 items-center justify-between rounded-lg font-sans select-none cursor-pointer text-left',
  {
    variants: {
      intent: intentVariants,
      emphasis: {
        normal: `w-full emphasis-normal ${fieldOpen}`,
        subtle: `w-full bg-subtle text-normal border border-transparent ${fieldOpen}`,
        // Not is-interactive-field: its field fills would show at rest. Hugs
        // its value like a subtler Button, with the same gap before the icon.
        subtler:
          'w-fit *:data-[slot=select-icon]:ml-1.5 emphasis-subtler is-interactive data-[popup-open]:bg-(--intent-4a) aria-invalid:intent-danger aria-invalid:border-(--intent-border-strong)'
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
