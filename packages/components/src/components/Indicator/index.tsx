'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

/* ─── RequiredIndicator ─── */

export interface RequiredIndicatorProps extends ComponentProps<'span'> {}

export function RequiredIndicator({
  className,
  children,
  ...props
}: RequiredIndicatorProps) {
  return (
    <span
      aria-hidden='true'
      className={cn('text-subtle intent-danger', className)}
      {...props}
    >
      {children ?? '*'}
    </span>
  )
}

RequiredIndicator.displayName = 'RequiredIndicator'

/* ─── OptionalIndicator ─── */

export interface OptionalIndicatorProps extends ComponentProps<'span'> {}

export function OptionalIndicator({
  className,
  children,
  ...props
}: OptionalIndicatorProps) {
  return (
    <span className={cn('text-sm text-subtle', className)} {...props}>
      {children ?? '(optional)'}
    </span>
  )
}

OptionalIndicator.displayName = 'OptionalIndicator'
