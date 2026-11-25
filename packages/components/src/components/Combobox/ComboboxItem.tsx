'use client'

import { type RefAttributes, use } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { cn } from '@oztix/roadie-core/utils'

import { keepTouchTap } from '../../utils/keepTouchTap'
import {
  PointerHighlightContext,
  optionHighlightClass
} from '../../utils/optionHighlight'
import { useVirtualItem } from '../../utils/virtualList'
import { optionRowClass } from '../../variants'

export type ComboboxItemProps = ComboboxPrimitive.Item.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxItem({
  className,
  onPointerDownCapture,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onMouseUp,
  onClickCapture,
  ref,
  ...props
}: ComboboxItemProps) {
  const byPointer = use(PointerHighlightContext)
  const virtualItem = useVirtualItem(ref, props.value)
  return (
    <ComboboxPrimitive.Item
      data-slot='combobox-item'
      className={cn(optionRowClass, optionHighlightClass(byPointer), className)}
      {...keepTouchTap({
        onPointerDownCapture,
        onPointerMove,
        onPointerUp,
        onPointerCancel,
        onMouseUp,
        onClickCapture
      })}
      {...props}
      {...virtualItem}
    />
  )
}

ComboboxItem.displayName = 'Combobox.Item'
