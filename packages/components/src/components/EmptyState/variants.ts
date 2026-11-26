import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

export type EmptyStateSize = 'sm' | 'md' | 'lg'

export type EmptyStateIntent =
  | 'neutral'
  | 'brand'
  | 'brand-secondary'
  | 'brand-blue'
  | 'brand-orange'
  | 'brand-purple'
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

// The parts style each size off the nearest root's data-size (empty-state.css),
// so they need no context. The plain classes are md.
export const emptyStateTitleClass = [
  'text-balance text-strong text-display-ui-3',
  'empty-state-sm:text-display-ui-5 empty-state-lg:text-display-prose-2'
].join(' ')

// text-<size>/prose scales the body while keeping prose leading; the adjacent
// rule tightens the description up to a directly preceding Title.
export const emptyStateDescriptionClass = [
  'text-pretty tracking-prose text-subtle',
  'max-w-md text-base/prose [[data-slot=empty-state-title]+&]:-mt-4',
  'empty-state-sm:max-w-sm empty-state-sm:text-sm/prose empty-state-sm:[[data-slot=empty-state-title]+&]:-mt-3',
  'empty-state-lg:max-w-lg empty-state-lg:text-lg/prose empty-state-lg:[[data-slot=empty-state-title]+&]:-mt-6'
].join(' ')

export const emptyStateIllustrationClass = [
  'grid justify-items-center [&_img]:max-h-40 [&_svg]:size-40',
  'empty-state-sm:[&_img]:max-h-24 empty-state-sm:[&_svg]:size-16',
  'empty-state-lg:w-full empty-state-lg:max-w-md empty-state-lg:[&_img]:max-h-none empty-state-lg:[&_img]:w-full empty-state-lg:[&_svg]:size-full'
].join(' ')
