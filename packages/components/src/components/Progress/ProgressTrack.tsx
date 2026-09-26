'use client'

import type { RefAttributes } from 'react'

import { Progress as ProgressPrimitive } from '@base-ui/react/progress'

import { cn } from '@oztix/roadie-core/utils'

export type ProgressTrackProps = ProgressPrimitive.Track.Props &
  RefAttributes<HTMLDivElement>

export function ProgressTrack({ className, ...props }: ProgressTrackProps) {
  return (
    <ProgressPrimitive.Track
      data-slot='progress-track'
      className={cn(
        'relative col-span-full h-1.5 w-full overflow-hidden rounded-full bg-(--intent-4)',
        'forced-colors:outline forced-colors:outline-1',
        className
      )}
      {...props}
    />
  )
}

ProgressTrack.displayName = 'Progress.Track'
