'use client'

import { Steps as ArkSteps } from '@ark-ui/react/steps'

import { cn } from '@oztix/roadie-core/utils'

export type StepsSeparatorProps = ArkSteps.SeparatorProps

export function StepsSeparator({ className, ...props }: StepsSeparatorProps) {
  return (
    <ArkSteps.Separator
      data-slot='steps-separator'
      className={cn(
        'h-0.5 flex-1 bg-subtle transition-all duration-200 ease-out md:bottom-0 md:translate-y-5.5',
        'data-complete:bg-strong',
        'data-[orientation=vertical]:ml-4 data-[orientation=vertical]:h-4 data-[orientation=vertical]:w-0.5',
        className
      )}
      {...props}
    />
  )
}

StepsSeparator.displayName = 'Steps.Separator'
