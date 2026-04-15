'use client'

import { Steps as ArkSteps } from '@ark-ui/react/steps'

import { cn } from '@oztix/roadie-core/utils'

export type StepsContentProps = {
  index: number
  className?: string
  children?: React.ReactNode
}

export function StepsContent({ className, ...props }: StepsContentProps) {
  const Content = ArkSteps.Content as React.ComponentType<
    StepsContentProps & { 'data-slot'?: string }
  >
  return (
    <Content data-slot='steps-content' className={cn(className)} {...props} />
  )
}

StepsContent.displayName = 'Steps.Content'
