'use client'

import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

export const inputVariants = cva(
  'w-full rounded-md font-sans transition-all outline-none disabled:opacity-50 disabled:pointer-events-none aria-[invalid=true]:emphasis-default-border aria-[invalid=true]:border-[var(--intent-danger-9)]',
  {
    variants: {
      intent: {
        neutral: 'intent-neutral',
        brand: 'intent-brand',
        accent: 'intent-accent',
        danger: 'intent-danger',
        success: 'intent-success',
        warning: 'intent-warning',
        info: 'intent-info',
      },
      emphasis: {
        default:
          'emphasis-default-surface emphasis-subtle-border emphasis-default-fg hover:emphasis-subtle-surface focus:outline-4 focus:outline-[color-mix(in_oklch,var(--intent-9)_30%,transparent)] focus:outline-offset-0',
        subtle:
          'emphasis-subtle-surface emphasis-default-fg border border-transparent focus:outline-4 focus:outline-[color-mix(in_oklch,var(--intent-9)_30%,transparent)] focus:outline-offset-0',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      intent: 'neutral',
      emphasis: 'default',
      size: 'md',
    },
  }
)

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
