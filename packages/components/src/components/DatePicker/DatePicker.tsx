'use client'

import { type ComponentProps, type Ref, useRef, useState } from 'react'

import { CalendarBlankIcon } from '@phosphor-icons/react'

import { viewerTimeZone } from '@oztix/roadie-core/datetime'
import { cn } from '@oztix/roadie-core/utils'

import { IconButton } from '../Button/IconButton'
import { Calendar } from '../Calendar'
import type { CalendarMatchers } from '../Calendar/matchers'
import { TypedInput } from '../DateField/TypedInput'
import { type DateStyle, formatDate, readDate } from '../DateField/readDate'
import { useTypedValue } from '../DateField/useTypedValue'
import { useFieldContext } from '../Field'
import { useFieldControlError } from '../Field/FieldContext'
import { inputVariants } from '../Input'
import { Popover } from '../Popover'
import type { HourCycle } from '../TimeField/readTime'
import { useTimeInput } from '../TimeField/useTimeInput'
import { type DateTimeParts, joinValue, splitValue } from './value'
import { datePickerGroupVariants, triggerSizes } from './variants'

export type DatePickerProps = Omit<
  ComponentProps<'div'>,
  'defaultValue' | 'onChange'
> & {
  /**
   * An ISO date such as `'2026-11-27'` at `day` granularity. At `minute`, an
   * ISO date-time; one with an offset is shown on the wall clock of
   * `timeZone`. Pair with `onValueChange`.
   */
  value?: string | null
  /** The value to start from when uncontrolled. */
  defaultValue?: string | null
  /**
   * Called with an ISO date at `day` granularity. At `minute`, with the
   * instant the date and time name in `timeZone`, with its offset, such as
   * `'2026-11-27T19:30:00+11:00'`, or null until both are known.
   */
  onValueChange?: (value: string | null) => void
  /**
   * `minute` adds a time field beside the date.
   *
   * @default 'day'
   */
  granularity?: 'day' | 'minute'
  /**
   * IANA zone whose wall clock the date and time are read on, and whose
   * calendar decides today. Pass the venue's zone for an event time. Defaults
   * to the viewer's.
   */
  timeZone?: string
  /**
   * `true` turns the picker off. Matchers, as on `Calendar`, disable those
   * days in the calendar and refuse them when typed. Inherits `true` from
   * `Field`.
   */
  disabled?: boolean | CalendarMatchers
  /** Marks the picker as invalid. Inherits from `Field` when omitted. */
  invalid?: boolean
  /** Inherits from `Field` when omitted. */
  required?: boolean
  /** Shows the value without letting it change. */
  readOnly?: boolean
  /** Submits the value with a form under this name. */
  name?: string
  /** The id of a form outside the picker to submit the value with. */
  form?: string
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg'
  /** @default 'normal' */
  emphasis?: 'normal' | 'subtle'
  /** Hint in the empty date input, such as "14 Mar or next Fri". */
  placeholder?: string
  /** A ref to the date input, for focusing it. */
  inputRef?: Ref<HTMLInputElement>
  /**
   * How the date reads when not being edited, from the datetime formatters.
   *
   * @default 'long'
   */
  dateStyle?: DateStyle
  /**
   * At `minute` granularity, `12` reads "7:30pm" and `24` reads "19:30".
   *
   * @default 12
   */
  hourCycle?: HourCycle
  /**
   * At `minute` granularity, minutes per step of the time field's arrow keys.
   * A typed time off the step shows an error.
   *
   * @default 1
   */
  minuteStep?: number
  /** Today as an ISO date. Defaults to today in `timeZone`. */
  today?: string
  /**
   * First day of the week in the calendar: 1 is Monday and 7 is Sunday.
   *
   * @default 1
   */
  weekStart?: number
  /** @default 'en-AU' */
  locale?: string
  /**
   * `dropdown` swaps the calendar's month name for month and year selects.
   *
   * @default 'label'
   */
  captionLayout?: 'label' | 'dropdown'
  /** The earliest month the calendar reaches, as any ISO date in it. */
  startMonth?: string
  /** The latest month the calendar reaches, as any ISO date in it. */
  endMonth?: string
  /** Whether the calendar is open. Pair with `onOpenChange`. */
  open?: boolean
  /** Whether the calendar starts open when uncontrolled. */
  defaultOpen?: boolean
  /** Called when the calendar opens or closes. */
  onOpenChange?: (open: boolean) => void
}

const EMPTY: DateTimeParts = { date: null, time: null }

/** A typed date field with a calendar to choose from, and a time when needed. */
export function DatePicker({
  value: valueProp,
  defaultValue,
  onValueChange,
  granularity = 'day',
  timeZone,
  disabled,
  invalid,
  required,
  readOnly,
  name,
  form,
  size = 'md',
  emphasis,
  placeholder,
  inputRef,
  dateStyle,
  hourCycle,
  minuteStep,
  today,
  weekStart,
  locale,
  captionLayout,
  startMonth,
  endMonth,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  ...props
}: DatePickerProps) {
  const field = useFieldContext()
  const zone = timeZone ?? viewerTimeZone()
  const withTime = granularity === 'minute'
  const isDisabled = disabled === true || !!field.disabled
  const disabledDays = typeof disabled === 'boolean' ? undefined : disabled
  const isInvalid = invalid ?? field.invalid

  const [local, setLocal] = useState(() => ({
    parts: splitValue(valueProp ?? defaultValue, zone),
    seen: valueProp,
    emitted: undefined as string | null | undefined
  }))
  // A value from outside replaces the local parts; the one just emitted does
  // not, so a date waiting for its time survives a parent that holds null.
  if (valueProp !== undefined && valueProp !== local.seen) {
    setLocal({
      parts:
        valueProp === local.emitted ? local.parts : splitValue(valueProp, zone),
      seen: valueProp,
      emitted: undefined
    })
  }
  // A controlled value decides what shows, so a refused change doesn't linger.
  // Local parts show only while they wait for their other half.
  const parts =
    valueProp === undefined
      ? local.parts
      : valueProp !== null
        ? splitValue(valueProp, zone)
        : joinValue(local.parts, granularity, zone) === null
          ? local.parts
          : EMPTY
  const value =
    valueProp !== undefined ? valueProp : joinValue(parts, granularity, zone)

  function update(patch: Partial<DateTimeParts>) {
    const next = { ...parts, ...patch }
    const joined = joinValue(next, granularity, zone)
    const changed = joined !== value
    setLocal((current) => ({
      ...current,
      // Read back, so a time a daylight saving jump skips shows where it lands.
      parts: joined && withTime ? splitValue(joined, zone) : next,
      emitted: changed ? joined : current.emitted
    }))
    if (changed) onValueChange?.(joined)
  }

  const date = useTypedValue({
    value: parts.date,
    defaultValue: undefined,
    onValueChange: (next) => update({ date: next }),
    format: (day) => formatDate(day, { dateStyle, locale }),
    read: (text) =>
      readDate(text, {
        today,
        timeZone: zone,
        weekStart,
        locale,
        dateStyle,
        disabled: disabledDays
      })
  })
  useFieldControlError(date.error)
  const time = useTimeInput({
    value: parts.time,
    defaultValue: undefined,
    onValueChange: (next) => update({ time: next }),
    hourCycle,
    minuteStep,
    locale,
    readOnly
  })
  const timeError = withTime ? time.typed.error : null
  useFieldControlError(timeError)
  // Unreadable text has made the value null, but a controlled parent may
  // still hold the old one; the form gets nothing it can't see.
  const unreadable = !!date.error || !!timeError

  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen
  function setOpen(next: boolean) {
    if (openProp === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  const groupRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const groupLabel = withTime
    ? {
        role: 'group',
        'aria-label': ariaLabel,
        'aria-labelledby':
          ariaLabelledBy ??
          (ariaLabel ? undefined : field.labelId || undefined),
        'aria-describedby': ariaDescribedBy
      }
    : {}

  return (
    <div
      data-slot='date-picker'
      className={cn(
        'grid gap-2',
        withTime && 'grid-cols-[minmax(0,1fr)_minmax(0,8rem)]',
        className
      )}
      {...groupLabel}
      {...props}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <div
          ref={groupRef}
          data-slot='date-picker-group'
          aria-invalid={isInvalid || !!date.error || undefined}
          data-disabled={isDisabled || undefined}
          className={datePickerGroupVariants({ size, emphasis })}
        >
          <TypedInput
            data-slot='date-picker-input'
            typed={date}
            form={form}
            disabled={isDisabled}
            invalid={invalid}
            required={required}
            readOnly={readOnly}
            aria-label={withTime ? 'Date' : ariaLabel}
            aria-labelledby={withTime ? undefined : ariaLabelledBy}
            aria-describedby={withTime ? undefined : ariaDescribedBy}
            placeholder={placeholder}
            ref={inputRef}
            className='h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle'
          />
          <Popover.Trigger
            disabled={isDisabled || readOnly}
            render={
              <IconButton
                aria-label='Choose date'
                emphasis='subtler'
                size={triggerSizes[size]}
                // The disabled group already dims, so the button doesn't again.
                className='in-data-disabled:opacity-100!'
              >
                <CalendarBlankIcon weight='bold' className='size-4' />
              </IconButton>
            }
          />
        </div>
        <Popover.Content
          ref={popupRef}
          aria-label='Choose date'
          align='start'
          positionerProps={{ anchor: groupRef }}
          className='max-w-[var(--available-width)]'
          initialFocus={() =>
            popupRef.current?.querySelector<HTMLElement>(
              '[data-slot="calendar"] button[data-date][tabindex="0"]'
            ) ?? true
          }
        >
          <Calendar
            selected={parts.date}
            onSelect={(day) => {
              // Pressing the chosen day again unselects it; keep it and close.
              if (day) date.setValue(day)
              setOpen(false)
            }}
            disabled={disabledDays}
            today={today}
            timeZone={zone}
            weekStart={weekStart}
            locale={locale}
            captionLayout={captionLayout}
            startMonth={startMonth}
            endMonth={endMonth}
          />
        </Popover.Content>
      </Popover>
      {withTime && (
        <TypedInput
          data-slot='date-picker-time'
          typed={time.typed}
          id={field.fieldId ? `${field.fieldId}-time` : undefined}
          aria-label='Time'
          form={form}
          disabled={isDisabled}
          invalid={invalid}
          required={required}
          readOnly={readOnly}
          className={inputVariants({ size, emphasis })}
          onKeyDown={time.onKeyDown}
        />
      )}
      {name && (
        <input
          type='hidden'
          name={name}
          form={form}
          disabled={isDisabled || undefined}
          value={unreadable ? '' : (value ?? '')}
        />
      )}
    </div>
  )
}

DatePicker.displayName = 'DatePicker'
