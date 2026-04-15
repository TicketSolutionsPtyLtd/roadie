import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export interface LabelProps extends ComponentProps<'label'> {}

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      data-slot='label'
      className={cn('text-sm font-medium text-normal', className)}
      {...props}
    />
  )
}

Label.displayName = 'Label'
