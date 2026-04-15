import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { intentVariants } from '../../variants'

export const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap gap-1 [&_svg]:size-[1em] [&_svg]:shrink-0',
  {
    variants: {
      intent: intentVariants,
      emphasis: {
        strong: 'emphasis-strong',
        normal: 'emphasis-normal text-subtle',
        subtle: 'emphasis-subtle text-subtle',
        subtler: 'emphasis-subtler text-subtle'
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-sm'
      }
    },
    defaultVariants: {
      emphasis: 'normal',
      size: 'md'
    }
  }
)

export interface BadgeProps
  extends ComponentProps<'span'>,
    VariantProps<typeof badgeVariants> {
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
  indicator,
  indicatorPulse,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      data-slot='badge'
      className={cn(badgeVariants({ intent, emphasis, size, className }))}
      {...props}
    >
      {indicator && (
        <span
          className={cn(
            'size-1.5 shrink-0 rounded-full bg-current',
            indicatorPulse && 'animate-pulse'
          )}
          aria-hidden='true'
        />
      )}
      {children}
    </span>
  )
}

Badge.displayName = 'Badge'
