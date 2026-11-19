'use client'

import { type KeyboardEvent, useId, useMemo, useState } from 'react'

import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'

import {
  addDays,
  addMonths,
  compareDates,
  monthGrid,
  plainDateOf,
  plainDateParts
} from '@oztix/roadie-core/datetime'
import {
  type RecordField,
  formatRecordValue,
  recordDates
} from '@oztix/roadie-core/records'
import { cn } from '@oztix/roadie-core/utils'

import { Button, IconButton } from '../Button'
import { dayLabel, weekCaption, weekdayNames } from '../Calendar/labels'
import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { knowsNow } from '../Records/clock'
import type { RecordsContentProps } from '../Records/layouts'
import type { RecordsRow } from '../Records/types'
import {
  RecordsLayoutState,
  RecordsProgress,
  useRecordsLayout
} from '../Records/useRecordsLayout'
import type { CalendarLayoutConfig } from './types'

const PLACEHOLDER_WEEKS = 5

type Day = readonly RecordsRow<object>[]

type Chip = {
  field?: RecordField
  timeZone: string
  getRowHref?: (row: object) => string | undefined
}

export type RecordCalendarContentProps = RecordsContentProps & {
  config: CalendarLayoutConfig
}

export function RecordCalendarContent({
  className,
  maxHeight,
  fill = false,
  config
}: RecordCalendarContentProps) {
  const frame = useRecordsLayout({ fill, maxHeight })
  const { records, state } = frame
  const { fields, timeZone, now } = records
  const locale = config.locale ?? 'en-AU'
  const layout = records.view.layout
  const dateKey =
    layout.type === 'calendar' ? layout.dateField : config.dateField
  const dateField = fields.find(({ key }) => key === dateKey)
  // Server renders and hydration read no clock, so today waits for the browser.
  const today = knowsNow(now) ? plainDateOf(now, timeZone) : null
  const [picked, setPicked] = useState<string>()
  const anchor = picked ?? config.defaultMonth ?? today
  const month = anchor && firstOfMonth(anchor)
  const weekStart = config.weekStart ?? 1
  const weekdays = useMemo(
    () => weekdayNames(weekStart, locale),
    [weekStart, locale]
  )
  const weeks = useMemo(() => {
    if (!month) return null
    const { year, month: number } = plainDateParts(month)
    return monthGrid(year, number, { weekStart })
  }, [month, weekStart])
  const days = useMemo(
    () =>
      weeks && dateField
        ? recordsByDay(
            records.matchingRows,
            dateField,
            timeZone,
            weeks[0]![0]!,
            weeks.at(-1)!.at(-1)!
          )
        : new Map<string, Day>(),
    [weeks, dateField, records.matchingRows, timeZone]
  )
  const chip: Chip = {
    field: fields.find(({ key }) => key === config.title),
    timeZone,
    getRowHref: records.getRowHref
  }
  const captionId = useId()
  const monthName = month ? weekCaption(month, month, locale) : ''

  return (
    <div
      {...frame.frameProps}
      data-slot='record-calendar'
      className={cn('grid w-full gap-3', className)}
    >
      <div className='flex flex-wrap items-center gap-2'>
        <p
          id={captionId}
          aria-live='polite'
          className='grow text-display-ui-5 text-strong'
        >
          {monthName}
        </p>
        <Button
          size='sm'
          emphasis='subtler'
          disabled={!today}
          onClick={() => setPicked(today ?? undefined)}
        >
          Today
        </Button>
        <IconButton
          aria-label='Previous month'
          size='sm'
          emphasis='subtler'
          disabled={!month}
          onClick={() => month && setPicked(addMonths(month, -1))}
        >
          <CaretLeftIcon weight='bold' className='size-4' />
        </IconButton>
        <IconButton
          aria-label='Next month'
          size='sm'
          emphasis='subtler'
          disabled={!month}
          onClick={() => month && setPicked(addMonths(month, 1))}
        >
          <CaretRightIcon weight='bold' className='size-4' />
        </IconButton>
      </div>
      {frame.busy && <RecordsProgress />}
      {state === 'error' ? (
        <RecordsLayoutState key={state} kind={state} records={records} />
      ) : (
        <table
          aria-labelledby={captionId}
          aria-busy={frame.busy || undefined}
          className={cn(
            'w-full table-fixed border-collapse text-sm',
            frame.dimmed && 'opacity-60'
          )}
          onKeyDown={moveBetweenDays}
        >
          <thead>
            <tr>
              {weekdays.map(({ long, short }) => (
                <th
                  key={long}
                  scope='col'
                  abbr={long}
                  className='p-1 text-start text-xs font-normal text-subtle'
                >
                  {short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody aria-hidden={!weeks || undefined}>
            {weeks
              ? weeks.map((week) => (
                  <tr key={week[0]}>
                    {week.map((date) => (
                      <CalendarDay
                        key={date}
                        date={date}
                        locale={locale}
                        outside={!date.startsWith(month!.slice(0, 7))}
                        today={date === today}
                        records={days.get(date) ?? []}
                        chip={chip}
                      />
                    ))}
                  </tr>
                ))
              : Array.from({ length: PLACEHOLDER_WEEKS }, (_, week) => (
                  <tr key={week}>
                    {weekdays.map(({ long }) => (
                      <td key={long} className={dayClass} />
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
RecordCalendarContent.displayName = 'RecordCalendarContent'

const dayClass = 'h-28 border border-subtler p-1 align-top'

function CalendarDay({
  date,
  locale,
  outside,
  today,
  records,
  chip
}: {
  date: string
  locale: string
  outside: boolean
  today: boolean
  records: Day
  chip: Chip
}) {
  const label = dayLabel(date, locale)
  return (
    <td
      data-date={date}
      data-today={today || undefined}
      data-outside={outside || undefined}
      aria-current={today ? 'date' : undefined}
      tabIndex={-1}
      className={cn(dayClass, 'is-focusable', outside && 'bg-subtler')}
    >
      <div className='grid min-w-0 content-start gap-1'>
        <span className='sr-only'>{today ? `Today, ${label}` : label}</span>
        <span
          aria-hidden
          className={cn(
            'grid size-6 place-items-center rounded-full text-xs',
            today
              ? 'intent-accent emphasis-strong'
              : outside
                ? 'text-subtler'
                : 'text-subtle'
          )}
        >
          {plainDateParts(date).day}
        </span>
        {records.length > 0 && (
          <ul role='list' className='grid min-w-0 gap-0.5'>
            {records.map((record) => (
              <li key={record.id} className='grid min-w-0'>
                <RecordChip record={record} chip={chip} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </td>
  )
}

function RecordChip({
  record,
  chip
}: {
  record: RecordsRow<object>
  chip: Chip
}) {
  const text =
    (chip.field &&
      formatRecordValue(record.row, chip.field, {
        timeZone: chip.timeZone
      })?.trim()) ||
    record.id
  const href = chip.getRowHref?.(record.row)
  const className =
    'intent-accent emphasis-subtle truncate rounded-sm px-1.5 py-0.5 text-xs no-underline'
  return href ? (
    <RoadieRoutedLink
      href={href}
      data-slot='record-calendar-chip'
      className={cn(className, 'is-interactive')}
    >
      {text}
    </RoadieRoutedLink>
  ) : (
    <span data-slot='record-calendar-chip' className={className}>
      {text}
    </span>
  )
}

/** Each record under every day its date field covers, within the grid. */
function recordsByDay(
  rows: readonly RecordsRow<object>[],
  field: RecordField,
  timeZone: string,
  first: string,
  last: string
) {
  const days = new Map<string, RecordsRow<object>[]>()
  for (const record of rows) {
    const span = recordDates(record.row, field, timeZone)
    if (!span) continue
    const end = compareDates(span[1], last) > 0 ? last : span[1]
    let day = compareDates(span[0], first) < 0 ? first : span[0]
    for (; compareDates(day, end) <= 0; day = addDays(day, 1)) {
      const held = days.get(day)
      if (held) held.push(record)
      else days.set(day, [record])
    }
  }
  return days
}

const STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7
}

/** Arrows move focus from day to day, wherever in the day it sits. */
function moveBetweenDays(event: KeyboardEvent<HTMLTableElement>) {
  const step = STEPS[event.key]
  const from = (event.target as HTMLElement).closest<HTMLElement>(
    'td[data-date]'
  )
  if (step === undefined || !from) return
  const rtl = getComputedStyle(from).direction === 'rtl'
  const date = addDays(
    from.dataset.date!,
    rtl && Math.abs(step) === 1 ? -step : step
  )
  const to = event.currentTarget.querySelector<HTMLElement>(
    `td[data-date="${date}"]`
  )
  if (!to) return
  event.preventDefault()
  to.focus()
}

const firstOfMonth = (date: string) => `${date.slice(0, 7)}-01`
