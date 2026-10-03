'use client'

import type { Ref } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { TypedInput } from '../../pickers/TypedInput'
import {
  type ReadDateOptions,
  formatDate,
  readDate
} from '../../pickers/readDate'
import type { HourCycle } from '../../pickers/readTime'
import { useTimeInput } from '../../pickers/useTimeInput'
import { useTypedValue } from '../../pickers/useTypedValue'
import type { DateTimeParts } from '../../pickers/value'
import { Field, useFieldContext } from '../Field'
import { useFieldControlError } from '../Field/FieldContext'
import { inputVariants } from '../Input'

export type RangeEndFieldProps = {
  label: 'Start' | 'End'
  parts: DateTimeParts
  onChange: (parts: DateTimeParts) => void
  /** Why the range as a whole can't be used, shown on this end. */
  error?: string | null
  withTime: boolean
  read: ReadDateOptions
  hourCycle?: HourCycle
  minuteStep?: number
  locale?: string
  disabled?: boolean
  readOnly?: boolean
  inputRef?: Ref<HTMLInputElement>
}

/** One end of a range: a typed date and, at minute granularity, a time. */
export function RangeEndField({
  error,
  disabled,
  ...props
}: RangeEndFieldProps) {
  return (
    <Field invalid={!!error} disabled={disabled}>
      <Field.Label>{props.label}</Field.Label>
      <RangeEndInputs {...props} />
      <Field.ErrorText>{error}</Field.ErrorText>
    </Field>
  )
}

function RangeEndInputs({
  label,
  parts,
  onChange,
  withTime,
  read,
  hourCycle,
  minuteStep,
  locale,
  readOnly,
  inputRef
}: Omit<RangeEndFieldProps, 'error' | 'disabled'>) {
  const field = useFieldContext()
  const date = useTypedValue({
    value: parts.date,
    defaultValue: undefined,
    onValueChange: (next) => onChange({ ...parts, date: next }),
    format: (day) => formatDate(day, { dateStyle: read.dateStyle, locale }),
    read: (text) => readDate(text, { ...read, locale })
  })
  useFieldControlError(date.error)
  const time = useTimeInput({
    value: parts.time,
    defaultValue: undefined,
    onValueChange: (next) => onChange({ ...parts, time: next }),
    hourCycle,
    minuteStep,
    locale,
    readOnly
  })
  useFieldControlError(withTime ? time.typed.error : null)

  return (
    <div
      className={cn(
        'grid gap-2',
        withTime && 'grid-cols-[minmax(0,1fr)_minmax(0,6.5rem)]'
      )}
    >
      <TypedInput
        data-slot='date-range-picker-input'
        typed={date}
        readOnly={readOnly}
        ref={inputRef}
        className={inputVariants({ size: 'sm' })}
      />
      {withTime && (
        <TypedInput
          data-slot='date-range-picker-time'
          typed={time.typed}
          id={field.fieldId ? `${field.fieldId}-time` : undefined}
          aria-label={`${label} time`}
          placeholder='Any time'
          readOnly={readOnly}
          className={inputVariants({ size: 'sm' })}
          onKeyDown={time.onKeyDown}
        />
      )}
    </div>
  )
}
