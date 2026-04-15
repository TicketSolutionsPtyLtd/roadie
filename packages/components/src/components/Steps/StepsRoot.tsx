'use client'

import { Steps as ArkSteps } from '@ark-ui/react/steps'
import { type VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { stepsVariants } from './variants'

export type StepsRootProps = Omit<ArkSteps.RootProps, 'orientation'> &
  VariantProps<typeof stepsVariants>

export function StepsRoot({ direction, className, ...props }: StepsRootProps) {
  return (
    <ArkSteps.Root
      orientation={direction === 'vertical' ? 'vertical' : 'horizontal'}
      data-slot='steps'
      className={cn(stepsVariants({ direction, className }))}
      {...props}
    />
  )
}

StepsRoot.displayName = 'Steps.Root'
