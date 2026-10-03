'use client'

import { type Ref, useEffect } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { SuggestingInput } from '../../pickers/SuggestingInput'
import { TypedInput } from '../../pickers/TypedInput'
import {
  type ReadDateOptions,
  formatDate,
  readDate
} from '../../pickers/readDate'
import type { HourCycle } from '../../pickers/readTime'
import { suggestDates } from '../../pickers/suggestDates'
import { useTimeInput } from '../../pickers/useTimeInput'
import { useTypedValue } from '../../pickers/useTypedValue'
import { Field, useFieldContext } from '../Field'
import { useFieldControlError } from '../Field/FieldContext'
import { inputVariants } from '../Input'
import type { RangeEnd } from './range'

export type RangeEndFieldProps = {
  label: 'Start' | 'End'
  parts: RangeEnd
  onChange: (parts: RangeEnd) => void
  /** Why the range as a whole can't be used, shown on this end. */
  error?: string | null
  withTime: boolean
  read: ReadDateOptions
  hourCycle?: HourCycle
  minuteStep?: number
  locale?: string
  disabled?: boolean
  inputRef?: Ref<HTMLInputElement>
  /** The fewest and most days a suggested range may span. */
  span?: { min?: number; max?: number }
  /** A suggested range was taken: both ends change. */
  onRange: (range: { start: string; end: string }) => void
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
  inputRef,
  span,
  onRange
}: Omit<RangeEndFieldProps, 'error' | 'disabled'>) {
  const field = useFieldContext()
  const date = useTypedValue({
    value: parts.date,
    defaultValue: undefined,
    // Text that names nothing commits null; the range waits for a fix rather
    // than reading it as an empty end.
    onValueChange: (next) =>
      onChange({
        ...parts,
        date: next,
        unreadable:
          (next === null && !!date.text.trim()) ||
          (withTime && !!time.typed.error)
      }),
    format: (day) => formatDate(day, { dateStyle: read.dateStyle, locale }),
    read: (text) => readDate(text, { ...read, locale })
  })
  useFieldControlError(date.error)
  const time = useTimeInput({
    value: parts.time,
    defaultValue: undefined,
    onValueChange: (next) =>
      onChange({
        ...parts,
        time: next,
        unreadable: (next === null && !!time.typed.text.trim()) || !!date.error
      }),
    hourCycle,
    minuteStep,
    locale
  })
  const timeError = withTime ? time.typed.error : null
  useFieldControlError(timeError)
  // Escape can put back an empty end without a change to report.
  const unreadable = !!date.error || !!timeError
  useEffect(() => {
    if (unreadable !== !!parts.unreadable) onChange({ ...parts, unreadable })
  })

  return (
    <div
      className={cn(
        'grid gap-2',
        withTime && 'grid-cols-[minmax(0,1fr)_minmax(0,6.5rem)]'
      )}
    >
      <SuggestingInput
        data-slot='date-range-picker-input'
        typed={date}
        suggest={(text) =>
          suggestDates(text, {
            ...read,
            locale,
            ranges: true,
            minDays: span?.min,
            maxDays: span?.max
          })
        }
        onChoose={({ start, end }) => {
          if (start === end) return date.setValue(start)
          // The range may leave this end's date as it was, so the typed
          // text would stay; it has been taken, so it goes.
          date.discard()
          onRange({ start, end })
        }}
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
          className={inputVariants({ size: 'sm' })}
          onKeyDown={time.onKeyDown}
        />
      )}
    </div>
  )
}
