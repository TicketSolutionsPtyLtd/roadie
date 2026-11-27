'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import { CaretDownIcon } from '@phosphor-icons/react/ssr'

import { mergeClassName } from '../../utils/mergeClassName'
import { FIRST_ROW } from './variants'

export type ComboboxTriggerProps = ComboboxPrimitive.Trigger.Props &
  RefAttributes<HTMLButtonElement>

export function ComboboxTrigger({
  className,
  children,
  ...props
}: ComboboxTriggerProps) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot='combobox-trigger'
      className={mergeClassName(
        [
          'shrink-0 text-subtle transition-transform duration-moderate data-[popup-open]:rotate-180',
          FIRST_ROW
        ],
        className
      )}
      {...props}
    >
      {children ?? <CaretDownIcon weight='bold' className='size-4' />}
    </ComboboxPrimitive.Trigger>
  )
}

ComboboxTrigger.displayName = 'Combobox.Trigger'
