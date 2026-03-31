'use client'

import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

const levelTag = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
  5: 'h5',
  6: 'h6'
} as const

export const headingVariants = cva('font-bold', {
  variants: {
    intent: {
      neutral: 'intent-neutral',
      brand: 'intent-brand',
      accent: 'intent-accent',
      danger: 'intent-danger',
      success: 'intent-success',
      warning: 'intent-warning',
      info: 'intent-info'
    },
    emphasis: {
      default: 'emphasis-strong-fg',
      strong: 'emphasis-strong-fg font-black',
      subtle: 'emphasis-subtle-fg font-medium',
      subtler: 'emphasis-subtler-fg font-normal',
      inverted: 'emphasis-inverted-fg'
    },
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl'
    }
  },
  defaultVariants: {
    emphasis: 'default',
    size: 'xl'
  }
})

type HeadingElement = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

export interface HeadingProps
  extends ComponentProps<'h2'>,
    VariantProps<typeof headingVariants> {
  level?: HeadingLevel
  as?: HeadingElement
}

export function Heading({
  level = 2,
  as,
  className,
  intent,
  emphasis,
  size,
  ...props
}: HeadingProps) {
  const Component: HeadingElement = as ?? levelTag[level]
  return (
    <Component
      className={cn(headingVariants({ intent, emphasis, size, className }))}
      {...props}
    />
  )
}

Heading.displayName = 'Heading'
