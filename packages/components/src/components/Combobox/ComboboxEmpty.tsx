'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { mergeClassName } from '../../utils/mergeClassName'
import { listEmptyClass } from '../../variants'

export type ComboboxEmptyProps = ComboboxPrimitive.Empty.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxEmpty({ className, ...props }: ComboboxEmptyProps) {
  return (
    <ComboboxPrimitive.Empty
      data-slot='combobox-empty'
      className={mergeClassName(listEmptyClass, className)}
      {...props}
    />
  )
}

ComboboxEmpty.displayName = 'Combobox.Empty'
