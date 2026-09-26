'use client'

import type { ReactNode, RefAttributes } from 'react'

import { Progress as ProgressPrimitive } from '@base-ui/react/progress'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieIntent, intentVariants } from '../../variants'
import { ProgressValueTextContext } from './ProgressContext'
import { ProgressIndicator } from './ProgressIndicator'
import { ProgressLabel } from './ProgressLabel'
import { ProgressTrack } from './ProgressTrack'
import { ProgressValue } from './ProgressValue'

export type ProgressRootProps = ProgressPrimitive.Root.Props &
  RefAttributes<HTMLDivElement> & {
    /** A visible label. Without children, the value shows beside it. */
    label?: ReactNode
    /** Spoken and shown in place of the percentage, such as "120 of 400". */
    valueText?: string
    intent?: RoadieIntent
  }

export function ProgressRoot({
  label,
  valueText,
  intent,
  className,
  children,
  ...props
}: ProgressRootProps) {
  return (
    <ProgressValueTextContext value={valueText}>
      <ProgressPrimitive.Root
        data-slot='progress'
        // An explicit undefined would wipe Base UI's default and getAriaValueText
        {...(valueText !== undefined && { 'aria-valuetext': valueText })}
        className={cn(
          'grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1.5',
          intent && intentVariants[intent],
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            {label != null && (
              <>
                <ProgressLabel>{label}</ProgressLabel>
                <ProgressValue />
              </>
            )}
            <ProgressTrack>
              <ProgressIndicator />
            </ProgressTrack>
          </>
        )}
      </ProgressPrimitive.Root>
    </ProgressValueTextContext>
  )
}

ProgressRoot.displayName = 'Progress.Root'
