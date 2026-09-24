'use client'

import { type RefAttributes } from 'react'

import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieIntent, intentVariants } from '../../variants'

export type ToggleEmphasis = 'normal' | 'subtle' | 'subtler'

export type ToggleSize = 'xs' | 'sm' | 'md' | 'lg'

// Pressed steps one rung up the emphasis ladder. Each rung applies only in
// its own state, so neither emphasis has to outrank the other.
export const toggleVariants = cva('btn is-interactive', {
  variants: {
    intent: intentVariants,
    emphasis: {
      normal:
        'not-data-[pressed]:emphasis-normal data-[pressed]:emphasis-strong',
      subtle:
        'not-data-[pressed]:emphasis-subtle data-[pressed]:emphasis-strong',
      subtler:
        'not-data-[pressed]:emphasis-subtler data-[pressed]:emphasis-subtle'
    },
    size: {
      xs: 'btn-xs [&[aria-label]]:btn-icon-xs',
      sm: 'btn-sm [&[aria-label]]:btn-icon-sm',
      md: 'btn-md [&[aria-label]]:btn-icon-md',
      lg: 'btn-lg [&[aria-label]]:btn-icon-lg'
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
     * Button sizes. A toggle with an `aria-label` renders square, for an
     * icon-only toggle.
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
