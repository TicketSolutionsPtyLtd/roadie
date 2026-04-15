'use client'

import { Steps as ArkSteps } from '@ark-ui/react/steps'

import { cn } from '@oztix/roadie-core/utils'

export type StepsCompletedContentProps = ArkSteps.CompletedContentProps

export function StepsCompletedContent({
  className,
  ...props
}: StepsCompletedContentProps) {
  return (
    <ArkSteps.CompletedContent
      data-slot='steps-completed-content'
      className={cn(className)}
      {...props}
    />
  )
}

StepsCompletedContent.displayName = 'Steps.CompletedContent'
