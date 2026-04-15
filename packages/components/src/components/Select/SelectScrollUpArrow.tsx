'use client'

import type { RefAttributes } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'
import { CaretUpIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

export type SelectScrollUpArrowProps = SelectPrimitive.ScrollUpArrow.Props &
  RefAttributes<HTMLDivElement>

export function SelectScrollUpArrow({
  className,
  ...props
}: SelectScrollUpArrowProps) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot='select-scroll-up-arrow'
      className={cn(
        'flex items-center justify-center py-1 text-subtle',
        className
      )}
      {...props}
    >
      <CaretUpIcon weight='bold' className='size-3' />
    </SelectPrimitive.ScrollUpArrow>
  )
}

SelectScrollUpArrow.displayName = 'Select.ScrollUpArrow'
