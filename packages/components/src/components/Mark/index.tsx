'use client'

import type { ComponentProps, ElementType } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

export const markVariants = cva(
  'inline-block justify-self-start px-[0.1em] py-[0.05em]',
  {
    variants: {
      intent: {
        neutral: 'intent-neutral',
        'neutral-inverted': 'intent-neutral',
        brand: 'intent-brand',
        'brand-secondary': 'intent-brand-secondary',
        accent: 'intent-accent',
        danger: 'intent-danger',
        success: 'intent-success',
        warning: 'intent-warning',
        info: 'intent-info'
      }
    },
    defaultVariants: { intent: 'info' }
  }
)

export type MarkProps<T extends ElementType = 'mark'> = {
  as?: T
  className?: string
} & VariantProps<typeof markVariants> &
  Omit<ComponentProps<T>, 'as' | 'className'>

const headingElements = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

export function Mark<T extends ElementType = 'mark'>({
  as,
  className,
  intent,
  ...props
}: MarkProps<T>) {
  const Component = as || 'mark'
  const isHeading =
    typeof Component === 'string' && headingElements.has(Component)
  const isNeutralInverted = intent === 'neutral-inverted'
  return (
    <Component
      className={cn(
        markVariants({ intent, className }),
        isNeutralInverted
          ? 'bg-[var(--color-neutral-0)] text-[var(--color-neutral-13)]'
          : 'bg-mark text-mark',
        isHeading && 'px-[0.4em] py-[0.2em]'
      )}
      {...props}
    />
  )
}

Mark.displayName = 'Mark'
