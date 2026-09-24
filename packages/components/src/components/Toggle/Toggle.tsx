'use client'

import { type RefAttributes } from 'react'

import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieIntent, intentVariants } from '../../variants'

export type ToggleEmphasis = 'normal' | 'subtle' | 'subtler'

export type ToggleSize =
  'xs' | 'sm' | 'md' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon-md' | 'icon-lg'

// Pressed steps one rung up the emphasis ladder. The subtler rung needs the
// extra `.is-interactive`, or subtler's transparent interactive fill wins.
export const toggleVariants = cva('btn is-interactive', {
  variants: {
    intent: intentVariants,
    emphasis: {
      normal: 'emphasis-normal data-[pressed]:emphasis-strong',
      subtle: 'emphasis-subtle data-[pressed]:emphasis-strong',
      subtler:
        'emphasis-subtler [&.is-interactive[data-pressed]]:emphasis-subtle'
    },
    size: {
      xs: 'btn-xs',
      sm: 'btn-sm',
      md: 'btn-md',
      lg: 'btn-lg',
      'icon-xs': 'btn-icon-xs',
      'icon-sm': 'btn-icon-sm',
      'icon-md': 'btn-icon-md',
      'icon-lg': 'btn-icon-lg'
    }
  },
  defaultVariants: { emphasis: 'normal', size: 'md' }
})

export type ToggleProps = TogglePrimitive.Props &
  RefAttributes<HTMLButtonElement> & {
    /** Sets the colour palette. Inherits from the surrounding intent when unset. */
    intent?: RoadieIntent
    /**
     * Emphasis at rest. Pressed steps up: `normal` and `subtle` to
     * `strong`, `subtler` to `subtle`.
     *
     * @default 'normal'
     */
    emphasis?: ToggleEmphasis
    /**
     * Button sizes. Use an `icon-*` size for an icon-only toggle, with an
     * `aria-label`.
     *
     * @default 'md'
     */
    size?: ToggleSize
  }

export function Toggle({
  className,
  intent,
  emphasis,
  size,
  ...props
}: ToggleProps) {
  return (
    <TogglePrimitive
      data-slot='toggle'
      className={cn(toggleVariants({ intent, emphasis, size }), className)}
      {...props}
    />
  )
}

Toggle.displayName = 'Toggle'
