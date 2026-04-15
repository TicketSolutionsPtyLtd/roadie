'use client'

import { Steps as ArkSteps } from '@ark-ui/react/steps'

import { cn } from '@oztix/roadie-core/utils'

export type StepsPrevTriggerProps = ArkSteps.PrevTriggerProps

export function StepsPrevTrigger({
  className,
  ...props
}: StepsPrevTriggerProps) {
  return (
    <ArkSteps.PrevTrigger
      data-slot='steps-prev-trigger'
      className={cn(className)}
      {...props}
    />
  )
}

StepsPrevTrigger.displayName = 'Steps.PrevTrigger'
