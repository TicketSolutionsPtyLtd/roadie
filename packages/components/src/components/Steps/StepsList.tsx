'use client'

import { Steps as ArkSteps } from '@ark-ui/react/steps'

import { cn } from '@oztix/roadie-core/utils'

export type StepsListProps = ArkSteps.ListProps

export function StepsList({ className, ...props }: StepsListProps) {
  return (
    <ArkSteps.List
      data-slot='steps-list'
      className={cn(
        'flex items-start justify-start rounded-xl bg-subtler px-4 py-3',
        'data-[orientation=vertical]:flex-col data-[orientation=vertical]:gap-2',
        className
      )}
      {...props}
    />
  )
}

StepsList.displayName = 'Steps.List'
