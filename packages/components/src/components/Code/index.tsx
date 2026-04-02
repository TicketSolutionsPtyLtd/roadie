'use client'

import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

export const codeVariants = cva(
  'font-mono rounded-md px-1.5 py-0.5 text-[0.9em]',
  {
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
        default: 'emphasis-default',
        strong: 'emphasis-strong',
        subtle: 'emphasis-subtle',
        subtler: 'emphasis-subtler'
      }
    },
    defaultVariants: {
      emphasis: 'default'
    }
  }
)

export interface CodeProps
  extends ComponentProps<'code'>,
    VariantProps<typeof codeVariants> {}

export function Code({ className, intent, emphasis, ...props }: CodeProps) {
  return (
    <code
      className={cn(codeVariants({ intent, emphasis, className }))}
      {...props}
    />
  )
}

Code.displayName = 'Code'
