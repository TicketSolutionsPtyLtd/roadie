'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { TypedInput } from '../../pickers/TypedInput'
import { type DateStyle, formatDate, readDate } from '../../pickers/readDate'
import { suggestDates } from '../../pickers/suggestDates'
import { useTypedValue } from '../../pickers/useTypedValue'
import { type CalendarMatchers } from '../Calendar/matchers'
import { useFieldControlError } from '../Field/FieldContext'
import { inputVariants } from '../Input'

export type DateFieldProps = Omit<
  ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'size' | 'type' | 'disabled'
> & {
  /** The date, as an ISO date such as `'2026-11-27'`. Pair with `onValueChange`. */
  value?: string | null
  /** The date to start from when uncontrolled. */
  defaultValue?: string | null
  /**
   * Called when typed text is committed, on blur or Enter, with an ISO date,
   * or null when the text is empty or names no date.
   */
  onValueChange?: (value: string | null) => void
  /**
   * `true` turns the field off. Matchers, as on `Calendar`, refuse those
   * dates: typing one shows an error. Inherits `true` from `Field`.
   */
  disabled?: boolean | CalendarMatchers
  /** Marks the field as invalid. Inherits from `Field` when omitted. */
  invalid?: boolean
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg'
  /** @default 'normal' */
  emphasis?: 'normal' | 'subtle'
  /**
   * How the date reads when not being edited, from the datetime formatters.
   *
   * @default 'long'
   */
  dateStyle?: DateStyle
  /** Today as an ISO date, for words like "today" and "next fri". */
  today?: string
  /** IANA zone whose calendar decides today. Defaults to the viewer's. */
  timeZone?: string
  /**
   * First day of the week, for "next week": 1 is Monday and 7 is Sunday.
   *
   * @default 1
   */
  weekStart?: number
  /** @default 'en-AU' */
  locale?: string
}

/** A text field that reads a typed date, such as "14 mar" or "next fri". */
export function DateField({
  value,
  defaultValue,
  onValueChange,
  disabled,
  invalid,
  size,
  emphasis,
  dateStyle,
  today,
  timeZone,
  weekStart,
  locale,
  className,
  ...props
}: DateFieldProps) {
  const readOptions = {
    today,
    timeZone,
    weekStart,
    locale,
    dateStyle,
    disabled: typeof disabled === 'boolean' ? undefined : disabled
  }
  const typed = useTypedValue({
    value,
    defaultValue,
    onValueChange,
    format: (date) => formatDate(date, { dateStyle, locale }),
    read: (text) => readDate(text, readOptions)
  })
  useFieldControlError(typed.error)

  return (
    <TypedInput
      data-slot='date-field'
      typed={typed}
      suggestions={{
        suggest: (text) => suggestDates(text, readOptions),
        onChoose: (suggestion) => typed.setValue(suggestion.start)
      }}
      disabled={disabled === true}
      invalid={invalid}
      className={cn(inputVariants({ size, emphasis }), className)}
      {...props}
    />
  )
}

DateField.displayName = 'DateField'
