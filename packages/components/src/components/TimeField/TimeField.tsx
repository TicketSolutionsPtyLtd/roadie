'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { TypedInput } from '../DateField/TypedInput'
import { useFieldControlError } from '../Field/FieldContext'
import { inputVariants } from '../Input'
import type { HourCycle } from './readTime'
import { useTimeInput } from './useTimeInput'

export type TimeFieldProps = Omit<
  ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'size' | 'type'
> & {
  /** The time, as `'HH:MM'` on a 24-hour clock. Pair with `onValueChange`. */
  value?: string | null
  /** The time to start from when uncontrolled. */
  defaultValue?: string | null
  /**
   * Called when typed text is committed, on blur or Enter, or a step is
   * taken, with `'HH:MM'`, or null when the text is empty or names no time.
   */
  onValueChange?: (value: string | null) => void
  /** Marks the field as invalid. Inherits from `Field` when omitted. */
  invalid?: boolean
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg'
  /** @default 'normal' */
  emphasis?: 'normal' | 'subtle'
  /**
   * `12` reads "7:30pm" and `24` reads "19:30". Either is typed in.
   *
   * @default 12
   */
  hourCycle?: HourCycle
  /**
   * Minutes per step. The arrow keys step by it, and a typed time off the
   * step shows an error.
   *
   * @default 1
   */
  minuteStep?: number
  /** @default 'en-AU' */
  locale?: string
}

/** A text field that reads a typed time, such as "7:30pm" or "19:30". */
export function TimeField({
  value,
  defaultValue,
  onValueChange,
  invalid,
  size,
  emphasis,
  hourCycle,
  minuteStep,
  locale,
  className,
  onKeyDown,
  ...props
}: TimeFieldProps) {
  const { typed, onKeyDown: onStepKeyDown } = useTimeInput({
    value,
    defaultValue,
    onValueChange,
    hourCycle,
    minuteStep,
    locale,
    readOnly: props.readOnly
  })
  useFieldControlError(typed.error)

  return (
    <TypedInput
      data-slot='time-field'
      typed={typed}
      invalid={invalid}
      className={cn(inputVariants({ size, emphasis }), className)}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        onStepKeyDown(event)
      }}
      {...props}
    />
  )
}

TimeField.displayName = 'TimeField'
