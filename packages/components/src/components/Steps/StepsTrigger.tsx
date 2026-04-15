'use client'

import { Steps as ArkSteps } from '@ark-ui/react/steps'

import { cn } from '@oztix/roadie-core/utils'

export type StepsTriggerProps = ArkSteps.TriggerProps

export function StepsTrigger({ className, ...props }: StepsTriggerProps) {
  return (
    <ArkSteps.Trigger
      data-slot='steps-trigger'
      className={cn(
        'group/step flex cursor-pointer flex-col items-center gap-1 rounded-md border-none bg-transparent px-3 py-3 transition-all duration-200 ease-out',
        'data-[orientation=vertical]:flex-row data-[orientation=vertical]:items-center data-[orientation=vertical]:gap-2',
        'data-current:intent-accent',
        className
      )}
      {...props}
    />
  )
}

StepsTrigger.displayName = 'Steps.Trigger'
