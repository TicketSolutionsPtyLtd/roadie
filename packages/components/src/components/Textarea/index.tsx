'use client'

import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

export const textareaVariants = cva(
  'w-full rounded-lg font-sans min-h-20 resize-y',
  {
    variants: {
      intent: {
        neutral: 'intent-neutral',
        brand: 'intent-brand',
        'brand-secondary': 'intent-brand-secondary',
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
        sm: 'px-1.5 py-2 text-base',
        md: 'px-2 py-2.5 text-base',
        lg: 'px-2 py-3 text-base'
      }
    },
    defaultVariants: {
      emphasis: 'normal',
      size: 'md'
    }
  }
)

export interface TextareaProps
  extends Omit<ComponentProps<'textarea'>, 'size'>,
    VariantProps<typeof textareaVariants> {}

export function Textarea({
  className,
  intent,
  emphasis,
  size,
  ...props
}: TextareaProps) {
  return (
    <textarea
      className={cn(textareaVariants({ intent, emphasis, size, className }))}
      {...props}
    />
  )
}

Textarea.displayName = 'Textarea'
