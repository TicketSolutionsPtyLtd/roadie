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
      },
      // After `size` so `p-0` beats its padding.
      hideLabel: {
        true: 'shrink-0 gap-0 p-0',
        false: ''
      }
    },
    compoundVariants: [
      { hideLabel: true, size: 'sm', class: 'size-2' },
      { hideLabel: true, size: 'md', class: 'size-2.5' }
    ],
    defaultVariants: {
      emphasis: 'normal',
      size: 'md',
      hideLabel: false
    }
  }
)

export interface BadgeProps
  extends
    ComponentProps<'span'>,
    Omit<VariantProps<typeof badgeVariants>, 'hideLabel'> {
  /** Show a dot indicator before the text */
  indicator?: boolean
  /** Animate the indicator with a slow pulse */
  indicatorPulse?: boolean
  /**
   * Show only a dot; the label stays announced, so it must describe the state.
   * @default false
   */
  hideLabel?: boolean
}

export function Badge({
  className,
  intent,
  emphasis,
  size,
  indicator,
  indicatorPulse,
  hideLabel = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      data-slot='badge'
      className={cn(
        badgeVariants({ intent, emphasis, size, hideLabel }),
        hideLabel && indicatorPulse && 'animate-pulse',
        className
      )}
      {...props}
    >
      {indicator && !hideLabel && (
        <span
          className={cn(
            'size-1.5 shrink-0 rounded-full bg-current',
            indicatorPulse && 'animate-pulse'
          )}
          aria-hidden='true'
        />
      )}
      {hideLabel ? <span className='sr-only'>{children}</span> : children}
    </span>
  )
}

Badge.displayName = 'Badge'
