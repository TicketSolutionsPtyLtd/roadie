'use client'

import { type ReactNode, type RefAttributes, use } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

import { cn } from '@oztix/roadie-core/utils'

import { SelectContext } from './SelectContext'
import { SelectValueSummary } from './SelectValueSummary'

export type SelectValueProps = SelectPrimitive.Value.Props &
  RefAttributes<HTMLSpanElement>

export function SelectValue({
  className,
  children,
  placeholder,
  ...props
}: SelectValueProps) {
  const { multiple, displayLabel } = use(SelectContext)
  const summarise =
    multiple && displayLabel && children == null
      ? (value: unknown): ReactNode =>
          Array.isArray(value) && value.length > 0 ? (
            <SelectValueSummary labels={value.map(displayLabel)} />
          ) : (
            placeholder
          )
      : undefined

  return (
    <SelectPrimitive.Value
      data-slot='select-value'
      className={cn(
        'min-w-0 flex-1 truncate data-[placeholder]:text-subtle',
        className
      )}
      placeholder={placeholder}
      {...props}
    >
      {summarise ?? children}
    </SelectPrimitive.Value>
  )
}

SelectValue.displayName = 'Select.Value'
