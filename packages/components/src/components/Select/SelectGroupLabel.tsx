'use client'

import type { RefAttributes } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

import { mergeClassName } from '../../utils/mergeClassName'
import { optionGroupLabelClass } from '../../variants'

export type SelectGroupLabelProps = SelectPrimitive.GroupLabel.Props &
  RefAttributes<HTMLDivElement>

export function SelectGroupLabel({
  className,
  ...props
}: SelectGroupLabelProps) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot='select-group-label'
      className={mergeClassName(optionGroupLabelClass, className)}
      {...props}
    />
  )
}

SelectGroupLabel.displayName = 'Select.GroupLabel'
