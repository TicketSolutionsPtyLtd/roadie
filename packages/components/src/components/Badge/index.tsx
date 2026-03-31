import type { ComponentProps, ReactNode } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

export const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap gap-1 [&_svg]:size-[1em]',
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
        strong: 'emphasis-strong',
        default: 'emphasis-default emphasis-subtle-fg',
        subtle: 'emphasis-subtle emphasis-subtle-fg',
        subtler: 'emphasis-subtler-surface emphasis-subtle-fg',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-sm',
      },
    },
    defaultVariants: {
      intent: 'neutral',
      emphasis: 'default',
      size: 'sm',
    },
  }
)

export interface BadgeProps
  extends ComponentProps<'span'>,
    VariantProps<typeof badgeVariants> {
  /** Icon element rendered before the text (use Phosphor Bold icons) */
  icon?: ReactNode
  /** Show a dot indicator before the text */
  indicator?: boolean
  /** Animate the indicator with a slow pulse */
  indicatorPulse?: boolean
}

export function Badge({
  className,
  intent,
  emphasis,
  size,
  icon,
  indicator,
  indicatorPulse,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ intent, emphasis, size, className }))}
      {...props}
    >
      {indicator && (
        <span
          className={cn(
            'size-1.5 rounded-full emphasis-strong-surface shrink-0',
            indicatorPulse && 'animate-pulse'
          )}
          aria-hidden="true"
        />
      )}
      {icon && (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  )
}

Badge.displayName = 'Badge'
