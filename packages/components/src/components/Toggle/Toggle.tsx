'use client'

import { type RefAttributes } from 'react'

import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { isIconOnly } from '../../utils/isIconOnly'
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
        'not-data-[pressed]:emphasis-subtler not-data-[pressed]:text-subtle data-[pressed]:emphasis-subtle data-[pressed]:is-selected'
    },
    size: {
      xs: 'btn-xs data-[icon-only]:btn-icon-xs',
      sm: 'btn-sm data-[icon-only]:btn-icon-sm',
      md: 'btn-md data-[icon-only]:btn-icon-md',
      lg: 'btn-lg data-[icon-only]:btn-icon-lg'
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
     * `strong`, `subtler` to a tinted fill with a strong edge.
     *
     * @default 'normal'
     */
    emphasis?: ToggleEmphasis
    /**
     * Button sizes. A toggle whose only child is an icon renders square.
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
  nativeButton,
  ...props
}: ToggleProps) {
  return (
    <TogglePrimitive
      nativeButton={nativeButton ?? !props.render}
      data-slot='toggle'
      data-icon-only={isIconOnly(props.children) ? '' : undefined}
      className={cn(toggleVariants({ intent, emphasis, size }), className)}
      {...props}
    />
  )
}

Toggle.displayName = 'Toggle'
