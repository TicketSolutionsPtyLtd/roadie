'use client'

import { type RefAttributes, use } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { keepTouchTap } from '../../utils/keepTouchTap'
import { mergeClassName } from '../../utils/mergeClassName'
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
      className={mergeClassName(
        [optionRowClass, optionHighlightClass(byPointer)],
        className
      )}
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
