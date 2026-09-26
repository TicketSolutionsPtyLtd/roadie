'use client'

import { type RefAttributes, use } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

import { cn } from '@oztix/roadie-core/utils'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
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
    // An object value made inline would be new each render and never settle.
    if (label !== undefined && (typeof value !== 'object' || value === null))
      registerLabel?.(value, label)
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
      className={cn(
        'flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-normal outline-none select-none',
        // A tapped option keeps focus, so on touch only the keyboard shows the highlight.
        'data-[highlighted]:focus-visible:bg-subtle [@media(hover:hover)]:data-[highlighted]:bg-subtle',
        className
      )}
      {...props}
    >
      {content}
    </SelectPrimitive.Item>
  )
}

SelectItem.displayName = 'Select.Item'
