'use client'

import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

export const inputVariants = cva('w-full rounded-md font-sans', {
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
      default: 'emphasis-sunken emphasis-subtle-border is-field-interactive',
      subtle:
        'emphasis-subtle-surface emphasis-default-fg border border-transparent is-field-interactive'
    },
    size: {
      sm: 'h-8 px-1.5 text-base',
      md: 'h-10 px-2 text-base',
      lg: 'h-12 px-2 text-base'
    }
  },
  defaultVariants: {
    intent: 'neutral',
    emphasis: 'default',
    size: 'md'
  }
})

export interface InputProps
  extends Omit<ComponentProps<'input'>, 'size'>,
    VariantProps<typeof inputVariants> {}

export function Input({
  className,
  intent,
  emphasis,
  size,
  type = 'text',
  ...props
}: InputProps) {
  return (
    <input
      type={type}
      className={cn(inputVariants({ intent, emphasis, size, className }))}
      {...props}
    />
  )
}

Input.displayName = 'Input'
