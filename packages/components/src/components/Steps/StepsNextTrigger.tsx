'use client'

import { Steps as ArkSteps } from '@ark-ui/react/steps'

import { cn } from '@oztix/roadie-core/utils'

export type StepsNextTriggerProps = ArkSteps.NextTriggerProps

export function StepsNextTrigger({
  className,
  ...props
}: StepsNextTriggerProps) {
  return (
    <ArkSteps.NextTrigger
      data-slot='steps-next-trigger'
      className={cn(className)}
      {...props}
    />
  )
}

StepsNextTrigger.displayName = 'Steps.NextTrigger'
