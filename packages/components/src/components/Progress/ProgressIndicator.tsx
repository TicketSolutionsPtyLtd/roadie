'use client'

import type { RefAttributes } from 'react'

import { Progress as ProgressPrimitive } from '@base-ui/react/progress'

import { cn } from '@oztix/roadie-core/utils'

export type ProgressIndicatorProps = ProgressPrimitive.Indicator.Props &
  RefAttributes<HTMLDivElement>

export function ProgressIndicator({
  className,
  ...props
}: ProgressIndicatorProps) {
  return (
    <ProgressPrimitive.Indicator
      data-slot='progress-indicator'
      className={cn(
        'h-full bg-strong transition-[width] duration-slow ease-standard',
        'data-[indeterminate]:animate-indeterminate',
        'forced-color-adjust-none forced-colors:bg-[CanvasText]',
        className
      )}
      {...props}
    />
  )
}

ProgressIndicator.displayName = 'Progress.Indicator'
