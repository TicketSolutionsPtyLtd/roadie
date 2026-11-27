'use client'

import type { RefAttributes } from 'react'

import { Progress as ProgressPrimitive } from '@base-ui/react/progress'

import { mergeClassName } from '../../utils/mergeClassName'

export type ProgressTrackProps = ProgressPrimitive.Track.Props &
  RefAttributes<HTMLDivElement>

export function ProgressTrack({ className, ...props }: ProgressTrackProps) {
  return (
    <ProgressPrimitive.Track
      data-slot='progress-track'
      className={mergeClassName(
        [
          'relative col-span-full h-1.5 w-full overflow-hidden rounded-full bg-(--intent-4)',
          // Sets the outline's style as well as its width.
          'forced-colors:outline-1'
        ],
        className
      )}
      {...props}
    />
  )
}

ProgressTrack.displayName = 'Progress.Track'
