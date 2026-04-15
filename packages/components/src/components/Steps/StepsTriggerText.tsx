import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type StepsTriggerTextProps = ComponentProps<'span'>

export function StepsTriggerText({
  className,
  ...props
}: StepsTriggerTextProps) {
  return (
    <span
      data-slot='steps-trigger-text'
      className={cn(
        'hidden text-sm font-bold md:block',
        'group-data-incomplete/step:text-subtle',
        'group-data-current/step:text-subtle',
        'group-data-complete/step:text-normal',
        'group-data-invalid/step-item:text-subtle group-data-invalid/step-item:intent-danger',
        className
      )}
      {...props}
    />
  )
}

StepsTriggerText.displayName = 'Steps.TriggerText'
