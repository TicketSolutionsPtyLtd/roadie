import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

export const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap',
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
        strong: 'emphasis-strong',
        subtle: 'emphasis-subtle',
        subtler: 'emphasis-subtler-surface emphasis-subtle-fg emphasis-subtle-border'
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-sm'
      }
    },
    defaultVariants: {
      intent: 'neutral',
      emphasis: 'subtle',
      size: 'sm'
    }
  }
)

export interface BadgeProps
  extends ComponentProps<'span'>,
    VariantProps<typeof badgeVariants> {}

export function Badge({
  className,
  intent,
  emphasis,
  size,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ intent, emphasis, size, className }))}
      {...props}
    />
  )
}

Badge.displayName = 'Badge'
