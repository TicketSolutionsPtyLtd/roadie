'use client'

import type { RefAttributes } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

import { mergeClassName } from '../../utils/mergeClassName'

export type SelectPositionerProps = SelectPrimitive.Positioner.Props &
  RefAttributes<HTMLDivElement>

export function SelectPositioner({
  className,
  ...props
}: SelectPositionerProps) {
  return (
    <SelectPrimitive.Positioner
      data-slot='select-positioner'
      className={mergeClassName('z-popover', className)}
      alignItemWithTrigger={false}
      {...props}
    />
  )
}

SelectPositioner.displayName = 'Select.Positioner'
