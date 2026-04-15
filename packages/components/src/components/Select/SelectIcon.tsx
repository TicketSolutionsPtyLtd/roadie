'use client'

import type { RefAttributes } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'
import { CaretDownIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

export type SelectIconProps = SelectPrimitive.Icon.Props &
  RefAttributes<HTMLSpanElement>

export function SelectIcon({ className, children, ...props }: SelectIconProps) {
  return (
    <SelectPrimitive.Icon
      data-slot='select-icon'
      className={cn(
        'duration-moderate ml-2 shrink-0 text-subtle transition-transform data-[popup-open]:rotate-180',
        className
      )}
      {...props}
    >
      {children ?? <CaretDownIcon weight='bold' className='size-4' />}
    </SelectPrimitive.Icon>
  )
}

SelectIcon.displayName = 'Select.Icon'
