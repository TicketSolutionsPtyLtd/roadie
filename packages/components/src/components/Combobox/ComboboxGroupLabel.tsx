'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { cn } from '@oztix/roadie-core/utils'

import { useVirtualGroupLabel } from '../../utils/virtualList'

export type ComboboxGroupLabelProps = ComboboxPrimitive.GroupLabel.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxGroupLabel({
  className,
  ref,
  ...props
}: ComboboxGroupLabelProps) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot='combobox-group-label'
      className={cn(
        'px-2 py-1.5 text-xs font-medium text-subtle select-none',
        // In a windowed list, the label of the group in view stays at the top.
        'data-virtual-label:sticky data-virtual-label:top-(--virtual-label-top) data-virtual-label:surface-floating',
        className
      )}
      {...props}
      {...useVirtualGroupLabel(ref)}
    />
  )
}

ComboboxGroupLabel.displayName = 'Combobox.GroupLabel'
