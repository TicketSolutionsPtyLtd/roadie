import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

export type EmptyStateSize = 'sm' | 'md' | 'lg'

export type EmptyStateIntent =
  | 'neutral'
  | 'brand'
  | 'brand-secondary'
  | 'accent'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'

// Root gap is the wider spacing between media, message and actions; the
// description's negative margin tightens it back to the title.
export const emptyStateVariants = cva('grid justify-items-center text-center', {
  variants: {
    intent: intentVariants,
    size: {
      sm: 'gap-4 py-8',
      md: 'gap-6 py-12',
      lg: 'gap-8 py-16 md:py-24'
    }
  },
  defaultVariants: { size: 'md' }
})

export const emptyStateTitleVariants = cva('text-balance text-strong', {
  variants: {
    size: {
      sm: 'text-display-ui-5',
      md: 'text-display-ui-3',
      lg: 'text-display-prose-2'
    }
  },
  defaultVariants: { size: 'md' }
})

// text-<size>/prose scales the body while keeping prose leading; the adjacent
// rule tightens the description up to a directly preceding Title.
export const emptyStateDescriptionVariants = cva(
  'text-pretty tracking-prose text-subtle',
  {
    variants: {
      size: {
        sm: 'max-w-sm text-sm/prose [[data-slot=empty-state-title]+&]:-mt-3',
        md: 'max-w-md text-base/prose [[data-slot=empty-state-title]+&]:-mt-4',
        lg: 'max-w-lg text-lg/prose [[data-slot=empty-state-title]+&]:-mt-6'
      }
    },
    defaultVariants: { size: 'md' }
  }
)

export const emptyStateIllustrationVariants = cva('grid justify-items-center', {
  variants: {
    size: {
      sm: '[&_img]:max-h-24 [&_svg]:size-16',
      md: '[&_img]:max-h-40 [&_svg]:size-40',
      lg: 'w-full max-w-md [&_img]:w-full [&_svg]:size-full'
    }
  },
  defaultVariants: { size: 'md' }
})
