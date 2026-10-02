'use client'

import { type ComponentProps, useRef, useState } from 'react'

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
import { Popover } from '../Popover'
import { TimeField } from '../TimeField'
import type { HourCycle } from '../TimeField/readTime'
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
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg'
  /** @default 'normal' */
  emphasis?: 'normal' | 'subtle'
  /** @default 'long' */
  dateStyle?: DateStyle
  /** @default 12 */
  hourCycle?: HourCycle
  /** @default 1 */
  minuteStep?: number
  /** Today as an ISO date. Defaults to today in `timeZone`. */
  today?: string
  /** @default 1 */
  weekStart?: number
  /** @default 'en-AU' */
  locale?: string
  /** @default 'label' */
  captionLayout?: 'label' | 'dropdown'
  /** The earliest month the calendar reaches, as any ISO date in it. */
  startMonth?: string
  /** The latest month the calendar reaches, as any ISO date in it. */
  endMonth?: string
  /** Whether the calendar is open. Pair with `onOpenChange`. */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

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
  size = 'md',
  emphasis,
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
  ...props
}: DatePickerProps) {
  const field = useFieldContext()
  const zone = timeZone ?? viewerTimeZone()
  const withTime = granularity === 'minute'
  const isDisabled = disabled === true || !!field.disabled
  const disabledDays = typeof disabled === 'boolean' ? undefined : disabled
  const isInvalid = invalid ?? field.invalid

  const [state, setState] = useState(() => ({
    parts: splitValue(valueProp ?? defaultValue, zone),
    seen: valueProp,
    emitted: undefined as string | null | undefined
  }))
  // A value from outside replaces the parts; the one just emitted does not,
  // so a date waiting for its time survives a parent that holds null.
  if (valueProp !== undefined && valueProp !== state.seen) {
    setState({
      parts:
        valueProp === state.emitted ? state.parts : splitValue(valueProp, zone),
      seen: valueProp,
      emitted: undefined
    })
  }
  const { parts } = state
  const value =
    valueProp !== undefined ? valueProp : joinValue(parts, granularity, zone)

  function update(patch: Partial<DateTimeParts>) {
    const next = { ...parts, ...patch }
    const joined = joinValue(next, granularity, zone)
    const changed = joined !== value
    setState((current) => ({
      ...current,
      parts: next,
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
        disabled: disabledDays
      })
  })
  useFieldControlError(date.error)

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
          ariaLabelledBy ?? (ariaLabel ? undefined : field.labelId || undefined)
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
          className={cn(
            datePickerGroupVariants({ size, emphasis }),
            isDisabled && 'opacity-50'
          )}
        >
          <TypedInput
            data-slot='date-picker-input'
            typed={date}
            disabled={isDisabled}
            invalid={invalid}
            required={required}
            readOnly={readOnly}
            aria-label={withTime ? 'Date' : ariaLabel}
            aria-labelledby={withTime ? undefined : ariaLabelledBy}
            className='h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle'
          />
          <Popover.Trigger
            disabled={isDisabled || readOnly}
            render={
              <IconButton
                aria-label='Choose date'
                emphasis='subtler'
                size={triggerSizes[size]}
              >
                <CalendarBlankIcon weight='bold' className='size-4' />
              </IconButton>
            }
          />
        </div>
        <Popover.Content
          ref={popupRef}
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
              if (!day) return
              date.setValue(day)
              setOpen(false)
            }}
            required
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
        <TimeField
          id={field.fieldId ? `${field.fieldId}-time` : undefined}
          aria-label='Time'
          value={parts.time}
          onValueChange={(time) => update({ time })}
          disabled={isDisabled}
          invalid={invalid}
          required={required}
          readOnly={readOnly}
          size={size}
          emphasis={emphasis}
          hourCycle={hourCycle}
          minuteStep={minuteStep}
          locale={locale}
        />
      )}
      {name && <input type='hidden' name={name} value={value ?? ''} />}
    </div>
  )
}

DatePicker.displayName = 'DatePicker'
