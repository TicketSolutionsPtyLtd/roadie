'use client'

import { type RefAttributes, use } from 'react'

import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'

import { cn } from '@oztix/roadie-core/utils'

import { isIconOnly } from '../../utils/isIconOnly'
import { ToggleGroupContext } from './ToggleGroupContext'
import { toggleGroupItemVariants } from './variants'

export type ToggleGroupItemProps<Value extends string = string> = Omit<
  TogglePrimitive.Props<Value>,
  'value' | 'pressed' | 'defaultPressed'
> &
  RefAttributes<HTMLButtonElement> & {
    /** Identifies the item in the group's `value` array. */
    value: Value
  }

export function ToggleGroupItem<Value extends string = string>({
  className,
  ...props
}: ToggleGroupItemProps<Value>) {
  const { size, emphasis, raisePressed } = use(ToggleGroupContext)
  return (
    <TogglePrimitive<Value>
      data-slot='toggle-group-item'
      data-icon-only={isIconOnly(props.children) ? '' : undefined}
      className={cn(
        toggleGroupItemVariants({ size, emphasis, raisePressed }),
        className
      )}
      {...props}
    />
  )
}

ToggleGroupItem.displayName = 'ToggleGroup.Item'
