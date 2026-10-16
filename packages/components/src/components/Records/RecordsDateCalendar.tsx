'use client'

import { useRef, useState } from 'react'

import { plainDateOf } from '@oztix/roadie-core/datetime'
import type { RecordField, RecordFilter } from '@oztix/roadie-core/records'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { Calendar } from '../Calendar'
import type { CalendarOperator } from './searchSuggestions'

type PickedDates = { start: string; end: string }

export type RecordsDateCalendarProps = {
  /** A date field. */
  field: RecordField
  /** One day's condition, or is between for a range. */
  operator: CalendarOperator
  /** The edited chip's filter, whose days show picked. */
  filter: RecordFilter | undefined
  /** A day was picked, or a range's second day. */
  onPick: (filter: RecordFilter) => void
  timeZone: string
  /** Today in `timeZone`, as the records read it. */
  today: string
}

// Two of Calendar's months side by side: each at least 17.5rem, 1.5rem apart.
const TWO_MONTHS_REM = 36.5

/** Two months where the dropdown has room for them, else one. */
function useMonthsThatFit() {
  const ref = useRef<HTMLDivElement>(null)
  const [months, setMonths] = useState(1)
  useIsomorphicLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      const rem = parseFloat(
        getComputedStyle(document.documentElement).fontSize
      )
      setMonths(element.clientWidth >= TWO_MONTHS_REM * rem ? 2 : 1)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, months] as const
}

const OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/

/** The day a date or date-time falls on, where the records are. */
const dayOf = (value: string, timeZone: string) =>
  OFFSET.test(value)
    ? plainDateOf(new Date(value), timeZone)
    : value.slice(0, 10)

function pickedDays(
  filter: RecordFilter | undefined,
  timeZone: string
): PickedDates | null {
  switch (filter?.operator) {
    case 'on':
    case 'before':
    case 'after': {
      const day = dayOf(filter.value, timeZone)
      return { start: day, end: day }
    }
    case 'between': {
      const [start, end] = filter.value
      return typeof start === 'string' && typeof end === 'string'
        ? { start: dayOf(start, timeZone), end: dayOf(end, timeZone) }
        : null
    }
    default:
      return null
  }
}

/** A date step's calendar, days only, so a timestamp field filters by whole days. */
export function RecordsDateCalendar(props: RecordsDateCalendarProps) {
  const [ref, numberOfMonths] = useMonthsThatFit()
  return (
    <div ref={ref} className='w-full'>
      <DateCalendar {...props} numberOfMonths={numberOfMonths} />
    </div>
  )
}
RecordsDateCalendar.displayName = 'RecordsDateCalendar'

function DateCalendar({
  field,
  operator,
  filter,
  onPick,
  timeZone,
  today,
  numberOfMonths
}: RecordsDateCalendarProps & { numberOfMonths: number }) {
  const picked = pickedDays(filter, timeZone)
  const shared = {
    timeZone,
    today,
    numberOfMonths,
    captionLayout: 'dropdown' as const,
    // On the chip's month, even under a condition that can't mark its dates.
    defaultMonth: picked?.start,
    className: numberOfMonths > 1 ? 'w-full max-w-166' : 'w-full max-w-80'
  }
  if (operator === 'between')
    return (
      <Calendar
        mode='range'
        aria-label={field.label}
        defaultSelected={
          picked && picked.start !== picked.end ? picked : undefined
        }
        onSelect={({ start, end }) => {
          if (start && end)
            onPick({ field: field.key, operator, value: [start, end] })
        }}
        {...shared}
      />
    )
  const day = picked?.start === picked?.end ? picked?.start : undefined
  return (
    <Calendar
      mode='single'
      aria-label={field.label}
      defaultSelected={day}
      // Picking the marked day again keeps it.
      onSelect={(date) => {
        const value = date ?? day
        if (value) onPick({ field: field.key, operator, value })
      }}
      {...shared}
    />
  )
}
