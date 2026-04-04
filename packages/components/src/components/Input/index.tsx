'use client'

import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

export const inputVariants = cva('w-full rounded-lg font-sans', {
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
      normal: 'emphasis-sunken border border-subtle is-interactive-field',
      subtle:
        'bg-subtle text-normal border border-transparent is-interactive-field'
    },
    size: {
      sm: 'h-8 px-1.5 text-base',
      md: 'h-10 px-2 text-base',
      lg: 'h-12 px-2 text-base'
    }
  },
  defaultVariants: {
    emphasis: 'normal',
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
