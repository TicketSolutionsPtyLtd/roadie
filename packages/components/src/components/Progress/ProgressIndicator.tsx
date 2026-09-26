'use client'

import { type RefAttributes, use } from 'react'

import { Progress as ProgressPrimitive } from '@base-ui/react/progress'

import { cn } from '@oztix/roadie-core/utils'

import { ProgressHasIntentContext } from './ProgressContext'

export type ProgressIndicatorProps = ProgressPrimitive.Indicator.Props &
  RefAttributes<HTMLDivElement>

export function ProgressIndicator({
  className,
  ...props
}: ProgressIndicatorProps) {
  const hasIntent = use(ProgressHasIntentContext)
  return (
    <ProgressPrimitive.Indicator
      data-slot='progress-indicator'
      className={cn(
        'h-full transition-[width] duration-slow ease-standard',
        // Matches Meter's accent-hue fill until an intent is asked for
        hasIntent ? 'bg-strong' : 'bg-chart-highlight',
        'data-[indeterminate]:animate-indeterminate',
        'forced-color-adjust-none forced-colors:bg-[CanvasText]',
        className
      )}
      {...props}
    />
  )
}

ProgressIndicator.displayName = 'Progress.Indicator'
