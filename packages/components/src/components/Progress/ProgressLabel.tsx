'use client'

import type { RefAttributes } from 'react'

import { Progress as ProgressPrimitive } from '@base-ui/react/progress'

import { cn } from '@oztix/roadie-core/utils'

export type ProgressLabelProps = ProgressPrimitive.Label.Props &
  RefAttributes<HTMLSpanElement>

export function ProgressLabel({ className, ...props }: ProgressLabelProps) {
  return (
    <ProgressPrimitive.Label
      data-slot='progress-label'
      className={cn(
        'min-w-0 truncate text-sm font-medium text-normal',
        className
      )}
      {...props}
    />
  )
}

ProgressLabel.displayName = 'Progress.Label'
