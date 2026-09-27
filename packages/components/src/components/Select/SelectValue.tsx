'use client'

import { Fragment, type ReactNode, type RefAttributes, use } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

import { cn } from '@oztix/roadie-core/utils'

import { SelectContext } from './SelectContext'
import { SelectValueSummary } from './SelectValueSummary'

const isText = (label: ReactNode): label is string | number =>
  typeof label === 'string' || typeof label === 'number'

// The summary mounts each label three times (visible, spoken, measured), so
// only plain text goes through it. Rich labels render once and truncate.
function MultipleValue({ labels }: { labels: ReactNode[] }) {
  if (labels.every(isText)) return <SelectValueSummary labels={labels} />
  return labels.map((label, index) => (
    <Fragment key={index}>
      {index > 0 && ', '}
      {label}
    </Fragment>
  ))
}

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
            <MultipleValue labels={value.map(displayLabel)} />
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
