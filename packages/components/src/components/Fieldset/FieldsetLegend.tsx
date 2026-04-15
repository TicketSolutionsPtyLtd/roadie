import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type FieldsetLegendProps = ComponentProps<'legend'>

export function FieldsetLegend({ className, ...props }: FieldsetLegendProps) {
  return (
    <legend
      data-slot='fieldset-legend'
      className={cn('text-lg font-semibold text-strong', className)}
      {...props}
    />
  )
}

FieldsetLegend.displayName = 'Fieldset.Legend'
