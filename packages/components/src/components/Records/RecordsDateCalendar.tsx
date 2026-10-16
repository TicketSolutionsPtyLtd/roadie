'use client'

import { plainDateOf } from '@oztix/roadie-core/datetime'
import type { RecordField, RecordFilter } from '@oztix/roadie-core/records'

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
export function RecordsDateCalendar({
  field,
  operator,
  filter,
  onPick,
  timeZone,
  today
}: RecordsDateCalendarProps) {
  const picked = pickedDays(filter, timeZone)
  const shared = {
    timeZone,
    today,
    className: 'w-full max-w-80'
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
RecordsDateCalendar.displayName = 'RecordsDateCalendar'
