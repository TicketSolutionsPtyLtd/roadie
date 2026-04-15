'use client'

import type { RefAttributes } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

import { cn } from '@oztix/roadie-core/utils'

import { SelectItemIndicator } from './SelectItemIndicator'
import { SelectItemText } from './SelectItemText'

export type SelectItemProps = SelectPrimitive.Item.Props &
  RefAttributes<HTMLDivElement>

export function SelectItem({ className, children, ...props }: SelectItemProps) {
  const content =
    typeof children === 'string' || typeof children === 'number' ? (
      <>
        <SelectItemText>{children}</SelectItemText>
        <SelectItemIndicator />
      </>
    ) : (
      children
    )

  return (
    <SelectPrimitive.Item
      data-slot='select-item'
      className={cn(
        'flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-normal outline-none select-none',
        'data-[highlighted]:bg-subtle',
        className
      )}
      {...props}
    >
      {content}
    </SelectPrimitive.Item>
  )
}

SelectItem.displayName = 'Select.Item'
