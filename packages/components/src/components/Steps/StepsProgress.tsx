'use client'

import { Steps as ArkSteps } from '@ark-ui/react/steps'

import { cn } from '@oztix/roadie-core/utils'

export type StepsProgressProps = ArkSteps.ProgressProps

export function StepsProgress({ className, ...props }: StepsProgressProps) {
  return (
    <ArkSteps.Progress
      data-slot='steps-progress'
      className={cn(
        'relative h-1 w-full overflow-hidden rounded-sm bg-subtle',
        'after:absolute after:inset-y-0 after:left-0 after:w-[calc(var(--percent)*1%)] after:bg-strong after:transition-[width] after:duration-300 after:ease-out',
        className
      )}
      {...props}
    />
  )
}

StepsProgress.displayName = 'Steps.Progress'
