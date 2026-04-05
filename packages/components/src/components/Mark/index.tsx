'use client'

import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

export const markVariants = cva('px-[0.2em] py-[0.05em]', {
  variants: {
    intent: {
      neutral: 'intent-neutral',
      brand: 'intent-brand',
      accent: 'intent-accent',
      danger: 'intent-danger',
      success: 'intent-success',
      warning: 'intent-warning',
      info: 'intent-info'
    }
  },
  defaultVariants: { intent: 'info' }
})

export interface MarkProps
  extends ComponentProps<'mark'>,
    VariantProps<typeof markVariants> {}

export function Mark({ className, intent, ...props }: MarkProps) {
  return (
    <mark
      className={cn(markVariants({ intent, className }), 'bg-mark text-mark')}
      {...props}
    />
  )
}

Mark.displayName = 'Mark'
