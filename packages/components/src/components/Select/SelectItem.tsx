'use client'

import { type RefAttributes, use } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

import { cn } from '@oztix/roadie-core/utils'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { focusedRowHighlightClass, optionRowClass } from '../../variants'
import { SelectContext } from './SelectContext'
import { SelectItemIndicator } from './SelectItemIndicator'
import { SelectItemText } from './SelectItemText'
import { itemLabel } from './itemLabels'

export type SelectItemProps = SelectPrimitive.Item.Props &
  RefAttributes<HTMLDivElement>

export function SelectItem({ className, children, ...props }: SelectItemProps) {
  const { registerLabel } = use(SelectContext)
  const label = itemLabel(children)
  const { value } = props
  useIsomorphicLayoutEffect(() => {
    if (label !== undefined) registerLabel?.(value, label)
  }, [registerLabel, value, label])

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
      className={cn(optionRowClass, focusedRowHighlightClass, className)}
      {...props}
    >
      {content}
    </SelectPrimitive.Item>
  )
}

SelectItem.displayName = 'Select.Item'
