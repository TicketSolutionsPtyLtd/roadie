import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

/** Size token shared across every EmptyState sub-component. */
export type EmptyStateSize = 'sm' | 'md' | 'lg'

/** Intent palette applied to the root so descendants inherit it via cascade. */
export type EmptyStateIntent =
  | 'neutral'
  | 'brand'
  | 'brand-secondary'
  | 'accent'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'

/**
 * Root layout. Centered grid; `gap` and vertical padding scale with size.
 * This gap is the *wider* spacing that separates the media, the message, and
 * the actions — the title and description are pulled back into a tight pair by
 * `emptyStateDescriptionVariants`. No background/border — wrap in a `Card` for
 * a surface. `intent` is optional and has no default, so when omitted the
 * palette cascades from an ancestor.
 */
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

/** Title type: bold UI display at sm/md, heavier prose display at lg. */
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

/**
 * Description: prose body copy, subtle, size-scaled with a readable max-width.
 * `text-<size>/prose` bakes the prose line-height (`--leading-prose`) into each
 * font-size so the body keeps long-form leading while the size scales — using
 * the `text-prose` bundle would lock the size. When it directly follows a
 * Title, a negative top margin pulls it back up so the title and description
 * read as one tight block, set apart from the wider root gap.
 */
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

/**
 * Illustration wrapper. Centers + size-scales a SpotIllustration (svg) or
 * a custom hero (img/svg) via descendant selectors so consumers can drop
 * raw media in without sizing it themselves.
 */
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
