'use client'

import type { ComponentProps, ElementType } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

export const textVariants = cva('', {
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
      default: 'emphasis-default-fg',
      strong: 'emphasis-strong-fg',
      subtle: 'emphasis-subtle-fg',
      subtler: 'emphasis-subtler-fg',
      inverted: 'emphasis-inverted-fg'
    },
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl'
    }
  },
  defaultVariants: {
    emphasis: 'default',
    size: 'base'
  }
})

export interface TextProps
  extends ComponentProps<'p'>,
    VariantProps<typeof textVariants> {
  as?: ElementType
}

export function Text({
  as: Component = 'p',
  className,
  intent,
  emphasis,
  size,
  ...props
}: TextProps) {
  return (
    <Component
      className={cn(textVariants({ intent, emphasis, size, className }))}
      {...props}
    />
  )
}

Text.displayName = 'Text'
