'use client'

import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

export const textareaVariants = cva(
  'w-full rounded-md font-sans transition-all outline-none min-h-20 resize-y disabled:opacity-50 disabled:pointer-events-none aria-[invalid=true]:emphasis-default-border aria-[invalid=true]:border-[var(--intent-danger-9)]',
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
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      intent: 'neutral',
      emphasis: 'default',
      size: 'md',
    },
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
