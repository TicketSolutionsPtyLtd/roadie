'use client'

import type { RefAttributes } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'
import { CaretDownIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

export type SelectScrollDownArrowProps = SelectPrimitive.ScrollDownArrow.Props &
  RefAttributes<HTMLDivElement>

export function SelectScrollDownArrow({
  className,
  ...props
}: SelectScrollDownArrowProps) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot='select-scroll-down-arrow'
      className={cn(
        'flex items-center justify-center py-1 text-subtle',
        className
      )}
      {...props}
    >
      <CaretDownIcon weight='bold' className='size-3' />
    </SelectPrimitive.ScrollDownArrow>
  )
}

SelectScrollDownArrow.displayName = 'Select.ScrollDownArrow'
